"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import { 
  Trophy, Star, Gamepad2, Users, ShoppingCart, 
  FileCog, Crown, Award, Zap, Target, BookOpen, 
  LayoutTemplate, Columns, ChevronRight, School, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- 1. Performanslı StatBadge Bileşeni (Memoized) ---
const StatBadge = memo(({ icon, value, label, colorClass }: { icon: React.ReactNode, value: string | number, label: string, colorClass: string }) => (
    <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-slate-900/60 border border-white/5 backdrop-blur-sm min-w-[72px] flex-1 transition-transform active:scale-95 touch-manipulation">
        <div className={cn("p-1.5 rounded-full mb-1 shadow-lg", colorClass)}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5 text-white" })}
        </div>
        <span className="text-base font-bold text-white tracking-tight">{value}</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold text-center leading-tight">{label}</span>
    </div>
));
StatBadge.displayName = "StatBadge";

// --- 2. Liderlik Tablosu Bileşeni ---
const HardestWorkersToday = memo(() => {
    const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        getLiveLeaderboard().then(data => {
            if(mounted) setDailyTop(data.slice(0, 5));
        }).finally(() => {
            if(mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);
    
    // Renkleri static object olarak dışarıda tutabiliriz ama burada basitlik için inline
    const getRankStyle = (index: number) => {
        switch(index) {
            case 0: return "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-500";
            case 1: return "from-slate-400/20 to-slate-500/20 border-slate-400/30 text-slate-300";
            case 2: return "from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400";
            default: return "bg-slate-800/30 border-slate-700/30 text-slate-400";
        }
    };

    if (loading) return <div className="space-y-2"><Skeleton className="h-10 w-full bg-slate-800/50 rounded-xl" /><Skeleton className="h-10 w-full bg-slate-800/50 rounded-xl" /></div>;

    return (
        <Card className="border-0 bg-transparent shadow-none p-0">
            <CardHeader className="px-0 py-2">
                <CardTitle className="flex items-center gap-2 text-white text-base">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-bold text-slate-200">Günün Efsaneleri</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
                {dailyTop.length > 0 ? dailyTop.map((student, index) => (
                    <div key={student.uid || index} className={cn("flex items-center justify-between p-2 rounded-lg border bg-gradient-to-r backdrop-blur-sm", getRankStyle(index))}>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-xs w-4 text-center">{index + 1}</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{student.displayName}</span>
                                <span className="text-[9px] text-slate-400 uppercase">{student.class || 'Öğrenci'}</span>
                            </div>
                        </div>
                        <span className="text-xs font-mono font-bold opacity-80">{(student.score || 0).toLocaleString()}</span>
                    </div>
                )) : (
                    <div className="text-center py-4 bg-slate-800/20 rounded-xl border border-dashed border-slate-700/50 text-slate-500 text-xs">Liste boş.</div>
                )}
            </CardContent>
        </Card>
    )
});
HardestWorkersToday.displayName = "HardestWorkersToday";

// --- 3. Ana Sayfa ---

export default function StudentDashboard() {
  const { user } = useAuth();
  
  // State tanımlarını basitleştirdik
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
      score: 0, completedTopics: 0, totalTopics: 100, 
      generalRank: 0, classRank: 0, questionBankProgress: 0,
  });
  const [examAlerts, setExamAlerts] = useState(0);

  // Veri Çekme Optimizasyonu
  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      if (!user?.uid) { 
          if(isMounted) setLoading(false); 
          return; 
      };

      try {
        // Paralel veri çekme
        const [allUsersSnapshot, examsSnapshot] = await Promise.all([
             getDocs(query(collection(db, "users"), where("role", "==", "student"))),
             getStudentExams(user.uid),
        ]);

        if (!isMounted) return;

        // Sınav bildirimleri
        if (examsSnapshot.success && examsSnapshot.data) {
             const pending = examsSnapshot.data.filter((a:any) => !a.solvedEvent).length;
             setExamAlerts(pending);
        }

        // Sıralama Mantığı (Client-side hesaplama - kullanıcı sayısı arttığında burası Backend'e taşınmalı)
        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, score: doc.data().score || 0, class: doc.data().class }));
        
        // Puan sıralaması (Büyükten küçüğe)
        allStudents.sort((a,b) => b.score - a.score);
        
        const generalRank = allStudents.findIndex(s => s.uid === user.uid) + 1;
        
        let classRank = 0;
        if(user.class) {
             const gradeName = user.class.split(' - ')[0]; // Örn: "11"
             // Sadece aynı sınıf seviyesindekileri filtrele
             const classStudents = allStudents.filter(s => s.class?.startsWith(gradeName)); 
             classRank = classStudents.findIndex(s => s.uid === user.uid) + 1;
        }

        setStats({
            score: user.score || 0,
            completedTopics: 45, // Burası dinamik olmalı
            totalTopics: 100,
            generalRank,
            classRank,
            questionBankProgress: 65 // Burası dinamik olmalı
        });

      } catch (error) {
        console.error("Dashboard Error", error);
      } finally {
        if(isMounted) setLoading(false);
      }
    }
    
    fetchData();
    return () => { isMounted = false; };
  }, [user]);

  const lessonProgress = useMemo(() => stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0, [stats]);

  // --- SKELETON EKRANI (Daha hızlı açılış hissi için) ---
  if (loading) {
    return (
        <div className="min-h-screen bg-slate-950 p-4 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full bg-slate-800" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-40 bg-slate-800" />
                    <Skeleton className="h-4 w-24 bg-slate-800" />
                </div>
            </div>
            <div className="flex gap-2 overflow-hidden">
                 {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-24 rounded-xl bg-slate-800" />)}
            </div>
            <Skeleton className="h-40 w-full rounded-3xl bg-slate-800" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-32 rounded-2xl bg-slate-800" />
                <Skeleton className="h-32 rounded-2xl bg-slate-800" />
            </div>
        </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 lg:pb-12 overflow-x-hidden">
        
        {/* Hafif Arkaplan Efekti (GPU Dostu) */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute top-[-5%] right-[-10%] w-[300px] h-[300px] bg-violet-600/10 rounded-full blur-[80px]" />
            <div className="absolute top-[20%] left-[-10%] w-[200px] h-[200px] bg-cyan-600/10 rounded-full blur-[60px]" />
        </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
          
          {/* --- MOBİL İÇİN KOMPAKT PROFİL --- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* SOL KISIM (Profil & Stats) */}
            <div className="lg:col-span-3 space-y-4">
                <div className="relative bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-3xl p-4 shadow-xl">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-violet-500 rounded-full animate-pulse opacity-50 blur-[2px]" />
                            <UserAvatar user={user} className="w-14 h-14 lg:w-20 lg:h-20 border-2 border-slate-900 relative z-10" />
                            <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 z-20">
                                <span className="bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Crown className="w-2.5 h-2.5" /> #{stats.generalRank || '-'}
                                </span>
                            </div>
                        </div>
                        
                        {/* İsim ve XP Bar */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-bold text-white truncate">{user?.displayName}</h1>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                                <School className="w-3 h-3 text-cyan-400" />
                                <span>{user?.class || 'Sınıf Belirsiz'}</span>
                            </div>
                            
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div style={{ width: `${lessonProgress}%` }} className="h-full bg-gradient-to-r from-cyan-400 to-violet-500" />
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 mt-0.5 font-mono">
                                <span>LVL {Math.floor(lessonProgress / 10) + 1}</span>
                                <span>{lessonProgress}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Yatay Kaydırılabilir İstatistikler */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2">
                    <StatBadge icon={<Star />} value={stats.score.toLocaleString()} label="Puan" colorClass="bg-amber-500/20 text-amber-500" />
                    <StatBadge icon={<Award />} value={`#${stats.classRank || '-'}`} label="Sınıf" colorClass="bg-cyan-500/20 text-cyan-500" />
                    <StatBadge icon={<Target />} value={stats.questionBankProgress + '%'} label="Soru" colorClass="bg-violet-500/20 text-violet-500" />
                    <StatBadge icon={<Zap />} value={stats.completedTopics} label="Konu" colorClass="bg-emerald-500/20 text-emerald-500" />
                </div>
            </div>

            {/* ORTA KISIM (Ana Aksiyonlar) */}
            <div className="lg:col-span-6 space-y-4">
                
                {/* 1. DERSLER (Ana Kart - Mobilde Height Düşürüldü) */}
                <Link href="/student/soru-bankasi" className="block group active:scale-[0.98] transition-transform">
                    <div className="relative h-36 sm:h-44 lg:h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 to-violet-800 p-5 lg:p-8 border border-white/10 shadow-lg shadow-indigo-900/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl transform translate-x-8 -translate-y-8" />
                        
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1.5 bg-white/20 rounded backdrop-blur-md">
                                        <BookOpen className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-[10px] font-bold bg-white/10 text-white px-2 py-0.5 rounded-full backdrop-blur-md">ANA GÖREV</span>
                                </div>
                                <h3 className="text-2xl font-black text-white tracking-tight">Dersler</h3>
                                <p className="text-indigo-200 text-xs mt-1 max-w-[200px] leading-tight">Konu anlatımları ve testlerle seviyeni yükselt.</p>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-1 mt-auto overflow-hidden">
                                <div style={{ width: `${lessonProgress}%` }} className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            </div>
                        </div>
                    </div>
                </Link>

                {/* 2. BUTON GRİDİ (Mobilde Grid yapısı ile alan tasarrufu) */}
                <div className="grid grid-cols-2 gap-3">
                    
                    {/* Denemeler */}
                    <Link href="/oyunlar/deneme" className="col-span-1 block group active:scale-95 transition-transform">
                        <div className="h-[120px] rounded-2xl bg-slate-900/60 border border-white/5 p-4 relative overflow-hidden flex flex-col justify-between hover:bg-slate-800">
                             {examAlerts > 0 && (
                                <span className="absolute top-3 right-3 flex h-2.5 w-2.5 z-10">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                            )}
                            <FileCog className="h-6 w-6 text-red-500" />
                            <div>
                                <h3 className="font-bold text-slate-100 text-sm">Denemeler</h3>
                                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                    {examAlerts > 0 ? <span className="text-red-400">{examAlerts} yeni sınav!</span> : 'Geçmiş sınavlar'}
                                </p>
                            </div>
                        </div>
                    </Link>

                    {/* Dükkan (Mobilde yukarı taşındı) */}
                    <Link href="/student/shop" className="col-span-1 block group active:scale-95 transition-transform">
                        <div className="h-[120px] rounded-2xl bg-gradient-to-br from-emerald-900/40 to-slate-900/60 border border-emerald-500/20 p-4 relative overflow-hidden flex flex-col justify-between hover:bg-slate-800">
                            <ShoppingCart className="h-6 w-6 text-emerald-400" />
                            <div>
                                <h3 className="font-bold text-emerald-100 text-sm">Market</h3>
                                <p className="text-[10px] text-emerald-400/70 leading-tight mt-0.5">Puanlarını harca</p>
                            </div>
                        </div>
                    </Link>

                    {/* Etkinlikler & Yarışmalar (Daha küçük butonlar) */}
                    <Link href="/oyunlar" className="col-span-1">
                        <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl flex items-center gap-3 hover:bg-slate-800 active:bg-slate-800 transition-colors">
                            <Gamepad2 className="h-5 w-5 text-cyan-400" />
                            <span className="text-xs font-semibold text-slate-300">Etkinlikler</span>
                        </div>
                    </Link>

                    <Link href="/student/yarismalar" className="col-span-1">
                         <div className="bg-slate-900/40 border border-white/5 p-3 rounded-xl flex items-center gap-3 hover:bg-slate-800 active:bg-slate-800 transition-colors">
                            <Users className="h-5 w-5 text-pink-400" />
                            <span className="text-xs font-semibold text-slate-300">Yarışmalar</span>
                        </div>
                    </Link>
                </div>

                {/* Alt Linkler */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <Link href="/student/yazilacaklar" className="bg-slate-900/30 border border-white/5 p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Columns className="h-4 w-4" /> Yazılacaklar
                    </Link>
                    <Link href="/student/ozetler" className="bg-slate-900/30 border border-white/5 p-3 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-400">
                        <LayoutTemplate className="h-4 w-4" /> Özetler
                    </Link>
                </div>

                {/* Mobilde Liderlik Tablosu */}
                <div className="lg:hidden mt-4">
                     <HardestWorkersToday />
                     <Link href="/leaderboard" className="block text-center text-xs text-slate-500 mt-2 py-2 border border-white/5 rounded-lg">
                        Tüm Sıralamayı Gör
                     </Link>
                </div>

            </div>

            {/* SAĞ KISIM (Desktop Liderlik) */}
            <div className="hidden lg:block lg:col-span-3 lg:sticky lg:top-8">
                 <div className="bg-slate-900/50 rounded-3xl p-4 border border-white/5 space-y-4">
                    <HardestWorkersToday />
                    <Link href="/leaderboard" className="block w-full py-2 text-center text-xs text-slate-400 hover:text-white bg-white/5 rounded-xl transition-colors">
                        Tüm Okulu Görüntüle
                    </Link>
                 </div>
            </div>

          </div>
      </div>
    </div>
  );
}