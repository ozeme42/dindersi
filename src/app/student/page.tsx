"use client";

import React, { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, where, orderBy, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass, QuestionBankStats } from "@/lib/types";
import { getCourseQuestionBankStats } from '@/app/student/soru-bankasi/actions';
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { 
  Trophy, Star, Gamepad2, Users, ShoppingCart, 
  FileCog, Crown, Award, Zap, Target, BookOpen, 
  LayoutTemplate, Columns, Loader2, ChevronRight, School
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Yardımcı Bileşenler ---

const StatBadge = ({ icon, value, label, colorClass }: { icon: ReactNode, value: string | number, label: string, colorClass: string }) => (
    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-sm shadow-inner min-w-[80px] w-full transition-transform hover:scale-105">
        <div className={cn("p-2 rounded-full mb-1 shadow-lg", colorClass)}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4 text-white" })}
        </div>
        <span className="text-lg font-bold text-white tracking-tight">{value}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold text-center leading-tight">{label}</span>
    </div>
);

function HardestWorkersToday() {
    const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getLiveLeaderboard().then(data => {
            setDailyTop(data.slice(0, 5)); // Masaüstünde daha fazla kişi gösterebiliriz
        }).finally(() => {
            setIsLoading(false);
        });
    }, []);
    
    const rankColors: { [key: number]: string } = {
        0: "from-yellow-300 to-yellow-600 border-yellow-400/50 text-yellow-100 shadow-yellow-900/20",
        1: "from-slate-300 to-slate-500 border-slate-400/50 text-slate-100 shadow-slate-900/20",
        2: "from-orange-300 to-orange-600 border-orange-400/50 text-orange-100 shadow-orange-900/20",
    };

    return (
        <Card className="border-0 bg-slate-900/40 backdrop-blur-md shadow-xl overflow-hidden h-full">
            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-white text-lg">
                    <Crown className="h-5 w-5 text-amber-500 fill-amber-500 animate-pulse" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-amber-500 font-bold">
                        Günün Efsaneleri
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-12 w-full rounded-xl bg-slate-800/50" />
                        <Skeleton className="h-12 w-full rounded-xl bg-slate-800/50" />
                        <Skeleton className="h-12 w-full rounded-xl bg-slate-800/50" />
                    </div>
                ) : dailyTop.length > 0 ? (
                    dailyTop.map((student, index) => (
                        <div key={student.uid} className="relative group">
                            {/* Hover Efekti */}
                            <div className={cn(
                                "absolute inset-0 rounded-xl bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300",
                                rankColors[index] || "from-slate-700 to-slate-800"
                            )} />
                            
                            <div className="relative flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-slate-800/30 hover:bg-slate-800/50 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs bg-gradient-to-br shadow-lg border",
                                        rankColors[index] || "bg-slate-700 border-slate-600 text-slate-300"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <UserAvatar user={student} className="w-8 h-8 border border-slate-700/50" />
                                    <div className="flex flex-col">
                                        <p className="font-bold text-slate-200 text-sm leading-none">{student.displayName}</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{student.class || 'Öğrenci'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono font-bold text-amber-400 text-sm">
                                        {(student.score || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 bg-slate-800/20 rounded-xl border border-dashed border-slate-700/50">
                        <Trophy className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-50"/>
                        <p className="text-slate-500 text-xs">Henüz liderlik tablosu boş.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// --- Ana Sayfa ---

export default function StudentDashboard() {
  const { user } = useAuth();
  
  type StatsType = {
      score: number;
      completedTopics: number;
      totalTopics: number;
      coursesStarted: number;
      coursesCompleted: number;
      totalCourses: number;
      generalRank: number;
      classRank: number;
      branchRank: number;
      questionBankProgress: number;
  };

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatsType>({
      score: 0, completedTopics: 0, totalTopics: 0, coursesStarted: 0, 
      coursesCompleted: 0, totalCourses: 0, generalRank: 0, classRank: 0, 
      branchRank: 0, questionBankProgress: 0,
  });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) { setIsLoading(false); return; };
      setIsLoading(true);
      try {
        let completedTopicsTotal = 0;
        let grandTotalTopics = 0;
        let studentClassName = user.class?.split(' - ')[0];
        let userScore = user.score || 0;

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsSnapshot] = await Promise.all([
             getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
             getDocs(collection(db, "courses")),
             getDocs(query(collection(db, "users"), where("role", "==", "student"))),
             getStudentExams(user.uid),
        ]);

        if (examsSnapshot.success && examsSnapshot.data) {
             const pending = examsSnapshot.data.filter((a:any) => !a.solvedEvent).length;
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

        // Simüle edilmiş veri (Sizin orijinal lojikten gelecek)
        setStats({
            score: userScore,
            completedTopics: 45, 
            totalTopics: 100, 
            coursesStarted: 3,
            coursesCompleted: 1,
            totalCourses: 5,
            generalRank,
            classRank,
            branchRank,
            questionBankProgress: 65
        });

      } catch (error) {
        console.error("Error", error);
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
                <div className="relative">
                    <div className="absolute inset-0 blur-xl bg-cyan-500/30 rounded-full animate-pulse"></div>
                    <Loader2 className="h-12 w-12 animate-spin text-cyan-400 relative z-10" />
                </div>
                {/* Desktop için Skeleton Layout */}
                <div className="hidden lg:grid grid-cols-3 gap-6 w-[800px] opacity-20 mt-8">
                    <div className="h-64 bg-slate-800 rounded-2xl col-span-1" />
                    <div className="h-64 bg-slate-800 rounded-2xl col-span-2" />
                </div>
            </div>
        </div>
    );
  }

  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 lg:pb-12 overflow-x-hidden selection:bg-cyan-500/30">
        
        {/* Optimize Edilmiş Arkaplan Efektleri (GPU Accelerated) */}
        <div className="fixed inset-0 pointer-events-none transform-gpu">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-900/10 rounded-full blur-[80px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[80px]" />
            <div className="absolute top-[20%] right-[30%] w-[20%] h-[20%] bg-indigo-500/5 rounded-full blur-[60px]" />
        </div>

      {/* --- ANA LAYOUT KAPSAYICI --- */}
      <div className="relative max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* SOL KOLON (Profil & İstatistikler) - Desktop'ta 3 birim */}
            <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-8">
                
                {/* Profil Kartı */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                    <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl flex flex-row lg:flex-col items-center gap-4 text-left lg:text-center">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-violet-500 rounded-full animate-spin-slow opacity-70 blur-[2px]" />
                            <UserAvatar user={user} className="w-16 h-16 lg:w-24 lg:h-24 border-4 border-slate-900 relative z-10" />
                            <div className="absolute -bottom-1 -right-1 lg:bottom-0 lg:right-0 bg-slate-900 rounded-full p-1 z-20">
                                <div className="bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                                    <Crown className="w-3 h-3" />
                                    <span>#{stats.generalRank > 0 ? stats.generalRank : '-'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-grow min-w-0">
                            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white mb-1 truncate">{user?.displayName}</h1>
                            <p className="text-sm text-slate-400 font-medium flex items-center lg:justify-center gap-1.5 mb-2">
                                <School className="w-3 h-3 text-cyan-400" />
                                {user?.class}
                            </p>
                            
                            {/* XP Bar */}
                            <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                <div 
                                    style={{ width: `${lessonProgress}%` }} 
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all duration-1000" 
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                                <span>LVL {Math.floor(lessonProgress / 10) + 1}</span>
                                <span>{lessonProgress}% EXP</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* İstatistik Grid'i (Mobilde Scroll, Desktopta Grid) */}
                <div className="flex lg:grid lg:grid-cols-2 gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                    <StatBadge 
                        icon={<Star />} 
                        value={stats.score.toLocaleString()} 
                        label="Puan" 
                        colorClass="bg-amber-500/20 text-amber-500" 
                    />
                    <StatBadge 
                        icon={<Award />} 
                        value={stats.classRank > 0 ? `#${stats.classRank}` : '-'} 
                        label="Sınıf" 
                        colorClass="bg-cyan-500/20 text-cyan-500" 
                    />
                    <StatBadge 
                        icon={<Target />} 
                        value={stats.questionBankProgress + '%'} 
                        label="Soru B." 
                        colorClass="bg-violet-500/20 text-violet-500" 
                    />
                    <StatBadge 
                        icon={<Zap />} 
                        value={stats.completedTopics} 
                        label="Konu" 
                        colorClass="bg-emerald-500/20 text-emerald-500" 
                    />
                </div>
                
                {/* Desktop'ta Yazılacaklar/Özetler Sol Alta Gelebilir */}
                <div className="hidden lg:grid grid-cols-2 gap-3">
                     <Link href="/student/yazilacaklar" className="block group">
                        <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-slate-800 hover:border-sky-500/30 transition-all">
                            <Columns className="h-5 w-5 text-sky-400 group-hover:scale-110 transition-transform"/>
                            <span className="text-xs text-slate-300 font-medium">Yazılacaklar</span>
                        </div>
                    </Link>
                    <Link href="/student/ozetler" className="block group">
                        <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-slate-800 hover:border-orange-500/30 transition-all">
                            <LayoutTemplate className="h-5 w-5 text-orange-400 group-hover:scale-110 transition-transform"/>
                            <span className="text-xs text-slate-300 font-medium">Özetler</span>
                        </div>
                    </Link>
                </div>
            </div>

            {/* ORTA KOLON (Ana Aksiyonlar) - Desktop'ta 6 birim */}
            <div className="lg:col-span-6 space-y-4">
                
                {/* Ana Buton: Dersler (Hero Card) */}
                <Link href="/student/soru-bankasi" className="block group">
                    <div className="relative h-40 lg:h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 lg:p-8 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-indigo-500/20 border border-white/10">
                        {/* Arkaplan Deseni */}
                        <div className="absolute top-0 right-0 p-16 bg-white/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:bg-white/10 transition-colors" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/30 blur-2xl rounded-full" />
                        
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md shadow-sm">
                                            <BookOpen className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                                        </div>
                                        <Badge variant="secondary" className="bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border-white/10">
                                            Ana Görev
                                        </Badge>
                                    </div>
                                    <h3 className="text-2xl lg:text-4xl font-black text-white tracking-tight drop-shadow-md">Dersler</h3>
                                    <p className="text-indigo-100 text-sm lg:text-base opacity-90 mt-1 max-w-[200px] lg:max-w-xs leading-relaxed">
                                        Konu anlatımları, testler ve soru bankası ile seviyeni yükselt.
                                    </p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-4xl lg:text-5xl font-black text-white/20 group-hover:text-white/40 transition-colors">
                                        %{lessonProgress}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-full bg-black/20 rounded-full h-1.5 mt-auto overflow-hidden backdrop-blur-sm">
                                <div style={{ width: `${lessonProgress}%` }} className="h-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                            </div>
                        </div>
                    </div>
                </Link>

                {/* İkincil Kartlar Grid */}
                <div className="grid grid-cols-2 gap-4">
                     {/* Denemeler */}
                    <Link href="/oyunlar/deneme" className="col-span-1 group relative">
                        <div className="h-full min-h-[140px] rounded-3xl bg-slate-900/60 border border-white/5 p-5 relative overflow-hidden transition-all hover:bg-slate-800 hover:border-red-500/20">
                                {examStats.pending > 0 && (
                                    <span className="absolute top-4 right-4 flex h-3 w-3 z-10">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                )}
                            <div className="absolute -right-6 -top-6 bg-gradient-to-br from-red-500/10 to-transparent w-32 h-32 rounded-full blur-2xl group-hover:from-red-500/20 transition-all" />
                            <FileCog className="h-8 w-8 text-red-500 mb-4 drop-shadow-lg" />
                            <h3 className="font-bold text-slate-100 text-lg">Denemeler</h3>
                            <p className="text-xs text-slate-400 mt-1 font-medium">
                                {examStats.pending > 0 ? `${examStats.pending} yeni sınav seni bekliyor!` : 'Geçmiş sınavlarını incele.'}
                            </p>
                        </div>
                    </Link>

                    {/* Liderlik Tablosu (Mobilde gizli değil ama burada gösteriyoruz, desktopta sağda olacak) */}
                    <Link href="/leaderboard" className="col-span-1 group lg:hidden">
                        <div className="h-full min-h-[140px] rounded-3xl bg-slate-900/60 border border-white/5 p-5 relative overflow-hidden transition-all hover:bg-slate-800 hover:border-amber-500/20">
                            <div className="absolute -right-6 -top-6 bg-gradient-to-br from-amber-500/10 to-transparent w-32 h-32 rounded-full blur-2xl" />
                            <Trophy className="h-8 w-8 text-amber-500 mb-4 drop-shadow-lg" />
                            <h3 className="font-bold text-slate-100 text-lg">Liderlik</h3>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Rakiplerini gör.</p>
                        </div>
                    </Link>
                    
                     {/* Puan Dükkanı (Desktop Orta Alanda da güzel durur) */}
                     <Link href="/student/shop" className="col-span-2 hidden lg:block group">
                        <div className="rounded-3xl bg-gradient-to-r from-emerald-900/30 to-emerald-800/30 border border-emerald-500/10 p-4 flex items-center justify-between px-6 hover:bg-emerald-900/40 hover:border-emerald-500/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                                    <ShoppingCart className="h-6 w-6 text-emerald-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base font-bold text-emerald-100">Puan Dükkanı</span>
                                    <span className="text-xs text-emerald-400/70">Puanlarını harca, ödülleri kap!</span>
                                </div>
                            </div>
                            <div className="bg-emerald-500/10 p-2 rounded-full group-hover:translate-x-1 transition-transform">
                                 <ChevronRight className="h-5 w-5 text-emerald-500" />
                            </div>
                        </div>
                    </Link>

                    {/* Etkinlikler & Yarışmalar */}
                    <Link href="/oyunlar" className="col-span-1 group">
                        <div className="h-28 rounded-2xl bg-slate-900/40 border border-white/5 p-4 flex flex-col justify-center gap-2 hover:bg-slate-800 hover:border-cyan-500/20 transition-all">
                            <Gamepad2 className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-semibold text-slate-300">Etkinlikler</span>
                        </div>
                    </Link>

                    <Link href="/student/yarismalar" className="col-span-1 group">
                        <div className="h-28 rounded-2xl bg-slate-900/40 border border-white/5 p-4 flex flex-col justify-center gap-2 hover:bg-slate-800 hover:border-pink-500/20 transition-all">
                            <Users className="h-6 w-6 text-pink-400 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-semibold text-slate-300">Yarışmalar</span>
                        </div>
                    </Link>
                </div>
                
                 {/* Mobil İçin Yazılacaklar/Özetler/Shop (Desktopta solda veya sağda) */}
                <div className="lg:hidden grid grid-cols-2 gap-3 mt-4">
                    <Link href="/student/shop" className="col-span-2">
                        <div className="rounded-2xl bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-500/20 p-3 flex items-center justify-between px-6 hover:bg-emerald-900/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <ShoppingCart className="h-5 w-5 text-emerald-400" />
                                <span className="text-sm font-bold text-emerald-100">Dükkan</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-emerald-500/50" />
                        </div>
                    </Link>
                    <Link href="/student/yazilacaklar" className="block">
                        <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex items-center gap-3 hover:bg-slate-800 transition-colors">
                            <Columns className="h-4 w-4 text-sky-400"/>
                            <span className="text-xs text-slate-300 font-medium">Yazılacaklar</span>
                        </div>
                    </Link>
                    <Link href="/student/ozetler" className="block">
                        <div className="bg-slate-900/50 border border-white/5 p-3 rounded-xl flex items-center gap-3 hover:bg-slate-800 transition-colors">
                            <LayoutTemplate className="h-4 w-4 text-orange-400"/>
                            <span className="text-xs text-slate-300 font-medium">Özetler</span>
                        </div>
                    </Link>
                </div>

                <div className="lg:hidden mt-6">
                     <HardestWorkersToday />
                </div>
            </div>

            {/* SAĞ KOLON (Liderlik & Ekstralar) - Desktop'ta 3 birim */}
            <div className="hidden lg:flex lg:col-span-3 flex-col space-y-4 lg:sticky lg:top-8 h-[calc(100vh-100px)]">
                <Link href="/leaderboard" className="block group">
                    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-white/5 hover:border-amber-500/30 transition-all cursor-pointer">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Trophy className="h-5 w-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">Genel Sıralama</p>
                                    <p className="text-xs text-slate-400">Tüm okulu gör</p>
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                        </CardContent>
                    </Card>
                </Link>
                
                <div className="flex-grow">
                     <HardestWorkersToday />
                </div>
                
                <div className="p-4 rounded-2xl bg-slate-900/30 border border-dashed border-slate-700/50 text-center">
                    <p className="text-xs text-slate-500">
                        "Başarı, her gün tekrarlanan küçük çabaların toplamıdır."
                    </p>
                </div>
            </div>
            
          </div>
      </div>
    </div>
  );
}
