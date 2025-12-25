'use client';

import React, { useState, useEffect } from "react";
import { 
    Trophy, Star, Gamepad2, ShoppingCart, Columns, LayoutTemplate, 
    FileCog, Crown, Award, Target, Sparkles, Map, Swords, Backpack,
    Loader2, ArrowRight, Flame, Gift, Timer, RefreshCcw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import type { Course, UserProfile } from "@/lib/types";
import { getLiveLeaderboard } from "@/app/leaderboard/actions";
import { getStudentExams } from "@/app/student/deneme/actions";
// DİKKAT: actions dosyan neredeyse oradan import et
import { forceStreakCheck } from "./actions"; 

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";

// --- GÜNLÜK LİDERLİK ---
function HardestWorkersToday() {
    const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getLiveLeaderboard().then(data => setDailyTop(data.slice(0, 3))).finally(() => setIsLoading(false));
    }, []);
    
    const rankIcons: { [key: number]: React.ReactNode } = {
        0: <Crown className="h-6 w-6 text-yellow-300 drop-shadow-md" />,
        1: <Award className="h-6 w-6 text-slate-300 drop-shadow-md" />,
        2: <Award className="h-6 w-6 text-orange-400 drop-shadow-md" />,
    };

    return (
        <Card className="bg-gradient-to-b from-slate-900/80 to-slate-950/80 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
            <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30"><Trophy className="h-5 w-5 text-amber-400" /></div>
                <h3 className="font-bold text-white text-lg tracking-wide uppercase">Günün Efsaneleri</h3>
            </div>
            <div className="p-4">
                {isLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl bg-white/5" />)}</div>
                ) : dailyTop.length > 0 ? (
                    <div className="space-y-3">
                        {dailyTop.map((student, index) => (
                            <div key={student.uid} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-white/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex items-center justify-center bg-black/40 rounded-lg border border-white/10">{rankIcons[index]}</div>
                                    <div className="flex items-center gap-3">
                                         <UserAvatar user={student} className="w-10 h-10 border-2 border-white/10"/>
                                         <div><p className="font-bold text-white text-sm">{student.displayName}</p><p className="text-white/40 text-xs font-mono">Lvl {Math.floor((student.score || 0) / 1000) + 1}</p></div>
                                    </div>
                                </div>
                                <div className="bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20"><p className="font-bold text-amber-400 text-sm">{(student.score || 0).toLocaleString()} XP</p></div>
                            </div>
                        ))}
                    </div>
                ) : ( <div className="text-center py-8"><p className="text-white/40 text-sm">Bugün henüz kimse XP kazanmadı.</p></div> )}
            </div>
        </Card>
    )
}

const DashboardCardButton = ({ href, icon, title, subtitle, colorClass, badge }: { href: string, icon: React.ReactNode, title: string, subtitle?: string, colorClass: string, badge?: number }) => {
     const colors: {[key: string]: string} = {
        "sky": "from-sky-500 to-blue-600 border-sky-600 shadow-sky-900/40", "rose": "from-rose-500 to-pink-600 border-rose-600 shadow-rose-900/40",
        "orange": "from-orange-500 to-amber-600 border-orange-600 shadow-orange-900/40", "indigo": "from-indigo-500 to-violet-600 border-indigo-600 shadow-indigo-900/40",
        "emerald": "from-emerald-500 to-green-600 border-emerald-600 shadow-emerald-900/40", "violet": "from-violet-500 to-purple-600 border-violet-600 shadow-violet-900/40",
     }
     return (
        <Button asChild className={cn("relative w-full h-auto flex flex-col md:flex-row items-center justify-center md:justify-start gap-3 p-4 rounded-2xl transition-all duration-300 group overflow-hidden border-b-[6px] active:border-b-0 active:translate-y-[6px] bg-gradient-to-br text-white shadow-xl", colors[colorClass])}>
            <Link href={href} className="w-full">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm shadow-inner shrink-0">{React.cloneElement(icon as React.ReactElement, { className: "h-6 w-6 text-white" })}</div>
                <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0"><span className="font-black text-lg uppercase tracking-wide leading-tight">{title}</span>{subtitle && <span className="text-[11px] font-medium opacity-80 leading-tight">{subtitle}</span>}</div>
                {badge && badge > 0 && (<div className="absolute top-2 right-2 flex h-6 min-w-[24px] px-1.5 items-center justify-center rounded-full bg-white text-red-600 text-xs font-black shadow-lg animate-bounce z-10">{badge}</div>)}
            </Link>
        </Button>
     )
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ score: 0, totalCourses: 0, generalRank: 0, classRank: 0, branchRank: 0, todayScore: 0 });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });
  const [isChecking, setIsChecking] = useState(false); // Manuel kontrol butonu durumu

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) { setIsLoading(false); return; };
      setIsLoading(true);
      try {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
        const startOfDay = new Date(`${todayStr}T00:00:00+03:00`);
        const endOfDay = new Date(`${todayStr}T23:59:59+03:00`);

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsSnapshot, todayScoreSnapshot] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(collection(db, "courses")),
          getDocs(query(collection(db, "users"), where("role", "==", "student"))),
          getStudentExams(user.uid),
          getDocs(query(collection(db, 'scoreEvents'), where('userId', '==', user.uid), where('timestamp', '>=', Timestamp.fromDate(startOfDay)), where('timestamp', '<=', Timestamp.fromDate(endOfDay))))
        ]);
        
        if (examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter(a => !a.solvedEvent).length;
            setExamStats({ pending, solved: examsSnapshot.data.length - pending });
        }

        const todayTotalScore = todayScoreSnapshot.docs.reduce((sum, doc) => {
            const data = doc.data();
            if (!data.gameType?.startsWith('smartboard_') && data.gameType !== 'Derece Puanı' && data.gameType !== 'Manuel Puan') {
                return sum + (data.points || 0);
            }
            return sum;
        }, 0);

        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & {uid: string}));
        const userScore = user.score || 0;
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        const generalRank = sortedAllStudents.findIndex(s => s.uid === user.uid) + 1;

        let classRank = 0; let branchRank = 0;
        if(user.class) {
            const gradeName = user.class.split(' - ')[0];
            const branchName = user.class;
            classRank = allStudents.filter(s => s.class?.startsWith(gradeName)).sort((a,b) => (b.score || 0) - (a.score || 0)).findIndex(s => s.uid === user.uid) + 1;
            branchRank = allStudents.filter(s => s.class === branchName).sort((a,b) => (b.score || 0) - (a.score || 0)).findIndex(s => s.uid === user.uid) + 1;
        }
        const studentVisibleCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course)).filter(c => !c.isTeacherOnly);
        setStats({ score: userScore, totalCourses: studentVisibleCourses.length, generalRank, classRank, branchRank, todayScore: todayTotalScore });
      } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }
    fetchData();
  }, [user]);

  // MANUEL KONTROL FONKSİYONU
  const handleForceCheck = async () => {
    if(!user || isChecking) return;
    setIsChecking(true);
    try {
        const res = await forceStreakCheck(user.uid);
        if(res.streakUpdated || res.newStreak !== user.currentStreak) {
            alert(`Süper! Seri güncellendi: ${res.newStreak} Gün`);
            window.location.reload();
        } else {
             alert(`Henüz 500 puana ulaşılmamış veya bugün zaten sayılmış. (Bugünkü Puan: ${stats.todayScore})`);
        }
    } catch(e) {
        alert("Hata oluştu.");
    } finally {
        setIsChecking(false);
    }
  };
  
  if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-indigo-500" /></div>;

  const level = Math.floor(stats.score / 1000) + 1;
  const progressToNextLevel = ((stats.score % 1000) / 1000) * 100;
  const dailyGoal = 500;
  const progressToDailyGoal = Math.min((stats.todayScore / dailyGoal) * 100, 100);
  const isGoalReached = stats.todayScore >= dailyGoal;
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const lastSpinStr = user?.lastWheelSpin ? new Date(user.lastWheelSpin.toDate()).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) : "";
  const canSpin = (user?.currentStreak || 0) >= 7 && isGoalReached && lastSpinStr !== todayStr;
  
  return (
    <div className="min-h-full bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-32 md:pb-12 text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/20 rounded-full blur-[150px]" /><div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" /></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
           {/* Profil Kartı */}
           <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl z-0"></div>
                <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="relative shrink-0">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1.5 bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-600 shadow-[0_0_40px_rgba(245,158,11,0.3)]">
                             <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-900 bg-slate-800"><UserAvatar user={user} className="w-full h-full" /></div>
                        </div>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-black py-1.5 px-4 rounded-full border border-indigo-500 shadow-lg whitespace-nowrap flex items-center gap-2">
                             <Sparkles className="h-3 w-3 text-yellow-400 fill-yellow-400"/> SEVİYE {level}
                        </div>
                    </div>
                    <div className="flex-1 text-center md:text-left w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">{user?.displayName}</h1>
                                <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-slate-300 font-medium"><Backpack className="h-4 w-4 text-indigo-400" /><span>{user?.class || 'Sınıfsız'}</span><span className="mx-2">•</span><span className="text-indigo-300">{stats.totalCourses} Ders</span></div>
                            </div>
                            <div className="flex items-center gap-3 justify-center md:justify-end">
                                <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 min-w-[160px]">
                                    <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30"><Star className="h-6 w-6 text-amber-400 fill-amber-400 animate-pulse" /></div>
                                    <div className="text-left"><p className="text-xs text-amber-200/70 font-bold uppercase tracking-wider">XP</p><p className="text-2xl font-black text-white tabular-nums">{stats.score.toLocaleString()}</p></div>
                                </div>
                                {/* SERİ KUTUSU VE BUTONU */}
                                <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 min-w-[140px] relative group/streak">
                                    <div className="p-3 bg-orange-500/20 rounded-xl border border-orange-500/30 relative"><Flame className="h-6 w-6 text-orange-500 fill-orange-500 animate-[bounce_2s_infinite]" /></div>
                                    <div className="text-left"><p className="text-xs text-orange-200/70 font-bold uppercase tracking-wider">Seri</p><p className="text-2xl font-black text-white tabular-nums">{user?.currentStreak || 0} Gün</p></div>
                                    
                                    {/* YENİLEME BUTONU */}
                                    <button onClick={handleForceCheck} disabled={isChecking} className="absolute -top-2 -right-2 bg-slate-700 hover:bg-slate-600 text-white p-1.5 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-90" title="Seriyi Kontrol Et">
                                        <RefreshCcw className={cn("w-3 h-3", isChecking && "animate-spin")} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide"><span>İlerleme</span><span>{Math.floor(progressToNextLevel)}%</span></div>
                            <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 relative"><div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.5)] transition-all duration-1000 ease-out" style={{ width: `${progressToNextLevel}%` }} /></div>
                        </div>
                    </div>
                </div>
           </div>
           
           {/* GÜNLÜK HEDEF */}
           <div className="relative w-full bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-1 border border-white/10 shadow-lg overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:px-8">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0"><Target className="h-6 w-6 text-emerald-400" /></div>
                        <div className="flex-1"><h3 className="font-bold text-white text-lg">Günlük Görev</h3><div className="flex items-center gap-2 text-sm text-slate-400"><span>Bugün {stats.todayScore} XP</span><span className="text-slate-600">/</span><span className="text-emerald-400 font-bold">{dailyGoal} XP Hedef</span></div></div>
                    </div>
                    <div className="flex-1 w-full md:max-w-md mx-4"><div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5"><div className={cn("h-full transition-all duration-1000 ease-out relative", isGoalReached ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-emerald-500/50")} style={{ width: `${progressToDailyGoal}%` }} /></div></div>
                    <div className="w-full md:w-auto flex justify-end">
                        {canSpin ? (
                             <Button onClick={() => router.push('/student/wheel')} className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black border-b-4 border-rose-800 active:border-b-0 active:translate-y-1 shadow-[0_0_20px_rgba(236,72,153,0.4)] animate-pulse"><Gift className="mr-2 h-5 w-5 animate-bounce" /> ÇARKI ÇEVİR!</Button>
                        ) : isGoalReached ? (
                             <Button disabled className="bg-slate-700 text-slate-400 border border-slate-600 cursor-not-allowed opacity-80"><Timer className="mr-2 h-4 w-4" /> Yarın Gel</Button>
                        ) : (
                             <div className="px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium flex items-center gap-2 whitespace-nowrap"><div className="h-2 w-2 rounded-full bg-slate-500 animate-pulse"></div>{Math.max(0, dailyGoal - stats.todayScore)} XP Daha Gerekli</div>
                        )}
                    </div>
                </div>
           </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/student/soru-bankasi" className="group block h-full"><div className="relative h-full rounded-3xl overflow-hidden bg-gradient-to-br from-sky-900 to-blue-900 border border-sky-500/30 shadow-2xl hover:scale-[1.02] p-8 flex flex-col"><div className="flex justify-between items-start mb-6"><div className="p-4 bg-sky-500/20 rounded-2xl border border-sky-400/30"><Map className="h-8 w-8 text-sky-300" /></div></div><h2 className="text-3xl font-black text-white mb-2">Macera <span className="text-sky-400">Haritası</span></h2><p className="text-sky-100/70 font-medium mb-8">Soruları çöz ve ilerle.</p><div className="mt-auto flex items-center gap-2 text-white font-bold text-lg">Hemen Başla <ArrowRight className="h-5 w-5" /></div></div></Link>
              <Link href="/leaderboard" className="group block h-full"><div className="relative h-full rounded-3xl overflow-hidden bg-gradient-to-br from-amber-900 to-orange-900 border border-amber-500/30 shadow-2xl hover:scale-[1.02] p-8 flex flex-col"><div className="flex justify-between items-start mb-6"><div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-400/30"><Trophy className="h-8 w-8 text-amber-300" /></div></div><h2 className="text-3xl font-black text-white mb-2">Şöhret <span className="text-amber-400">Salonu</span></h2><div className="mt-auto grid grid-cols-3 gap-3"><div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center"><span className="text-2xl font-black text-white">#{stats.generalRank}</span><span className="text-[10px] text-amber-200/60 uppercase">Genel</span></div><div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center"><span className="text-2xl font-black text-white">#{stats.classRank}</span><span className="text-[10px] text-amber-200/60 uppercase">Sınıf</span></div><div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center"><span className="text-2xl font-black text-white">#{stats.branchRank}</span><span className="text-[10px] text-amber-200/60 uppercase">Şube</span></div></div></div></Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
               <DashboardCardButton href="/oyunlar" icon={<Gamepad2 />} title="Etkinlikler" subtitle="Arcade" colorClass="sky" />
               <DashboardCardButton href="/student/yarismalar" icon={<Swords />} title="Arena" subtitle="Çok Oyunculu" colorClass="rose" />
               <DashboardCardButton href="/student/yazilacaklar" icon={<Columns />} title="Panolar" subtitle="Notlar" colorClass="orange" />
               <DashboardCardButton href="/student/ozetler" icon={<LayoutTemplate />} title="Özetler" subtitle="Ders Notları" colorClass="indigo" />
               <DashboardCardButton href="/student/shop" icon={<ShoppingCart />} title="Mağaza" subtitle="Puan Harca" colorClass="emerald" />
               <DashboardCardButton href="/student/deneme" icon={<FileCog />} title="Denemeler" subtitle="Sınav Merkezi" colorClass="violet" badge={examStats.pending} />
          </div>
          <HardestWorkersToday />
      </div>
    </div>
  );
}