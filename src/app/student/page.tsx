
'use client';

import React, { useState, useEffect } from "react";
import { 
    BookOpen, Trophy, Star, Gamepad2, Users, 
    ShoppingCart, Columns, LayoutTemplate, FileCog, 
    Crown, Award, Zap, Target, Sparkles, Map, Swords, Backpack,
    Loader2, Home, User, ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, QuestionBankStats } from "@/lib/types";
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";


function HardestWorkersToday() {
    const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getLiveLeaderboard('daily').then(data => {
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
        <Card className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
            <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
                     <Trophy className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="font-bold text-white text-lg tracking-wide uppercase">Günün Efsaneleri</h3>
            </div>
            <div className="p-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-xl bg-white/5" />
                        ))}
                    </div>
                ) : dailyTop.length > 0 ? (
                    <div className="space-y-3">
                        {dailyTop.map((student, index) => (
                            <div key={student.uid} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-white/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex items-center justify-center bg-black/40 rounded-lg border border-white/10 group-hover:border-amber-500/30 transition-colors">
                                        {rankIcons[index]}
                                    </div>
                                    <div className="flex items-center gap-3">
                                         <UserAvatar user={student} className="w-10 h-10 border-2 border-white/10 group-hover:border-amber-400 transition-colors"/>
                                         <div>
                                            <p className="font-bold text-white text-sm group-hover:text-amber-200 transition-colors">{student.displayName}</p>
                                            <p className="text-white/40 text-xs font-mono">Lvl {Math.floor((student.score || 0) / 1000) + 1}</p>
                                         </div>
                                    </div>
                                </div>
                                <div className="bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                                    <p className="font-bold text-amber-400 text-sm">{(student.score || 0).toLocaleString()} <span className="text-[10px] opacity-70">XP</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                         <div className="inline-block p-4 rounded-full bg-white/5 mb-3">
                            <Trophy className="h-8 w-8 text-white/20" />
                         </div>
                         <p className="text-white/40 text-sm">Bugün henüz kimse XP kazanmadı.</p>
                         <p className="text-indigo-400 text-xs mt-1 font-bold cursor-pointer hover:underline">İlk sen ol!</p>
                    </div>
                )}
            </div>
        </Card>
    )
}

// --- ANA SAYFA KARTI BİLEŞENİ ---
const DashboardCardButton = ({ href, icon, title, subtitle, colorClass, badge }: { href: string, icon: React.ReactNode, title: string, subtitle?: string, colorClass: string, badge?: number }) => {
     // Renk sınıflarını parçala (basit bir haritalama)
     const colors: {[key: string]: string} = {
        "sky": "from-sky-500 to-blue-600 border-sky-600 shadow-sky-900/40",
        "rose": "from-rose-500 to-pink-600 border-rose-600 shadow-rose-900/40",
        "orange": "from-orange-500 to-amber-600 border-orange-600 shadow-orange-900/40",
        "indigo": "from-indigo-500 to-violet-600 border-indigo-600 shadow-indigo-900/40",
        "emerald": "from-emerald-500 to-green-600 border-emerald-600 shadow-emerald-900/40",
        "violet": "from-violet-500 to-purple-600 border-violet-600 shadow-violet-900/40",
     }

     const gradient = colors[colorClass] || "from-slate-700 to-slate-800 border-slate-600";

     return (
        <Button asChild className={cn(
            "relative w-full h-auto flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 p-4 rounded-2xl transition-all duration-300 group overflow-hidden",
            "border-b-[6px] active:border-b-0 active:translate-y-[6px]", // 3D effect
            "bg-gradient-to-br text-white shadow-xl",
            gradient
        )}>
            <Link href={href} className="w-full">
                {/* Işıltı Efekti */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner shrink-0">
                    {React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6 text-white" })}
                </div>
                
                <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
                    <span className="font-black text-lg uppercase tracking-wide leading-tight">{title}</span>
                    {subtitle && <span className="text-[11px] font-medium opacity-80 leading-tight">{subtitle}</span>}
                </div>

                {badge && badge > 0 && (
                    <div className="absolute top-2 right-2 flex h-6 min-w-[24px] px-1.5 items-center justify-center rounded-full bg-white text-red-600 text-xs font-black shadow-lg animate-bounce z-10">
                        {badge}
                    </div>
                )}
            </Link>
        </Button>
     )
}


export default function StudentDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
      score: 0,
      generalRank: 0,
      classRank: 0,
      branchRank: 0,
  });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });

  const getAllUsers = async (): Promise<UserProfile[]> => {
      const usersSnapshot = await getDocs(query(collection(db, "users"), where("role", "in", ["student", "guest"])));
      return usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  };
  
  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) {
          setIsLoading(false);
          return;
      };

      setIsLoading(true);
      
      try {
        const [allUsersSnapshot, examsSnapshot] = await Promise.all([
          getAllUsers(),
          getStudentExams(user.uid),
        ]);
        
        if (examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter(a => !a.solvedEvent).length;
            const solved = examsSnapshot.data.length - pending;
            setExamStats({ pending, solved });
        }

        const allStudents = allUsersSnapshot;
        const userScore = user.score || 0;
        
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0;
        let branchRank = 0;

        if(user.class) {
            const gradeName = user.class.split(' - ')[0];
            const branchName = user.class;

            const studentsInGrade = allStudents.filter(s => s.class?.startsWith(gradeName));
            classRank = studentsInGrade.length > 0 ? studentsInGrade.sort((a,b) => (b.score || 0) - (a.score || 0)).findIndex(s => s.uid === user.uid) + 1 : 0;

            const studentsInBranch = allStudents.filter(s => s.class === branchName);
            branchRank = studentsInBranch.length > 0 ? studentsInBranch.sort((a,b) => (b.score || 0) - (a.score || 0)).findIndex(s => s.uid === user.uid) + 1 : 0;
        }

        setStats({
            score: userScore,
            generalRank,
            classRank,
            branchRank,
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
        <div className="flex h-screen w-full items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold animate-pulse">Profilin Yükleniyor...</p>
            </div>
        </div>
    );
  }

  const level = Math.floor(stats.score / 1000) + 1;
  const progressToNextLevel = ((stats.score % 1000) / 1000) * 100;
  
  return (
    <div className="min-h-full bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-32 md:pb-12 text-white font-sans selection:bg-indigo-500/30">
      
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/20 rounded-full blur-[150px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          
           <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl z-0"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 opacity-50 z-0"></div>
                
                <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                    
                    <div className="relative shrink-0">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1.5 bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-600 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
                             <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-900 bg-slate-800">
                                <UserAvatar user={user} className="w-full h-full" />
                             </div>
                        </div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-black py-1.5 px-4 rounded-full border border-indigo-500 shadow-lg whitespace-nowrap flex items-center gap-2">
                             <Sparkles className="h-3 w-3 text-yellow-400 fill-yellow-400"/>
                             SEVİYE {level}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">{user?.displayName}</h1>
                                <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-slate-300 font-medium">
                                    <Backpack className="h-4 w-4 text-indigo-400" />
                                    <span>{user?.class || 'Sınıfsız Gezgin'}</span>
                                </div>
                            </div>
                            
                            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 min-w-[200px]">
                                <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
                                    <Star className="h-6 w-6 text-amber-400 fill-amber-400 animate-pulse" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs text-amber-200/70 font-bold uppercase tracking-wider">Toplam XP</p>
                                    <p className="text-2xl font-black text-white tabular-nums">{stats.score.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                                <span>Seviye İlerlemesi</span>
                                <span>{Math.floor(progressToNextLevel)}%</span>
                            </div>
                            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out relative overflow-hidden"
                                    style={{ width: `${progressToNextLevel}%` }}
                                >
                                    <div className="absolute inset-0 bg-[url('/stripe-pattern.png')] opacity-20 animate-slide"></div>
                                </div>
                            </div>
                            <p className="text-right text-xs text-slate-500 mt-1">Sonraki seviye için {1000 - (stats.score % 1000)} XP gerekli</p>
                        </div>
                    </div>
                </div>
           </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
               <DashboardCardButton 
                   href="/student/soru-bankasi" 
                   icon={<Map />} 
                   title="Macera Haritası" 
                   subtitle="Dersleri Öğren"
                   colorClass="sky"
               />
               <DashboardCardButton 
                   href="/oyunlar" 
                   icon={<Gamepad2 />} 
                   title="Etkinlikler" 
                   subtitle="Eğlenerek Pekiştir"
                   colorClass="rose"
               />
               <DashboardCardButton 
                   href="/student/yarismalar" 
                   icon={<Swords />} 
                   title="Arena" 
                   subtitle="Arkadaşlarınla Yarış"
                   colorClass="orange"
               />
               <DashboardCardButton 
                   href="/student/deneme" 
                   icon={<FileCog />} 
                   title="Denemeler" 
                   subtitle="Sınav Merkezi"
                   colorClass="violet"
                   badge={examStats.pending}
               />
                <DashboardCardButton 
                   href="/student/shop" 
                   icon={<ShoppingCart />} 
                   title="Mağaza" 
                   subtitle="Puan Harca"
                   colorClass="emerald"
               />
                 <DashboardCardButton 
                   href="/leaderboard" 
                   icon={<Trophy />} 
                   title="Liderlik" 
                   subtitle="Şampiyonları Gör"
                   colorClass="indigo"
               />
          </div>
          
          <HardestWorkersToday />
      </div>
    </div>
  );
}
