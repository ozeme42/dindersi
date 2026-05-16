'use client';

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { 
    Trophy, Star, Gamepad2, ShoppingCart, Columns, LayoutTemplate, 
    FileCog, Crown, Award, Target, Sparkles, Map, Swords, Backpack,
    Loader2, ArrowRight, Flame, Gift, Timer, School, Compass, LogOut 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp, onSnapshot, doc, getDoc } from "firebase/firestore";
import type { Course, UserProfile, SchoolClass } from "@/lib/types";
import { getStudentExams } from "@/app/student/deneme/actions";
import { forceStreakCheck } from "@/app/student/actions"; 

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";

// --- TASARIMI KORUNAN: GÜNLÜK LİDERLİK TABLOSU ---
function HardestWorkersToday() {
    const [dailyTop, setDailyTop] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDailyTop = async () => {
            setIsLoading(true);
            try {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

                const q = query(
                    collection(db, 'scoreEvents'),
                    where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
                    where('timestamp', '<=', Timestamp.fromDate(endOfDay))
                );
                
                const snapshot = await getDocs(q);
                const userScores: Record<string, number> = {};

                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const uid = data.userId;
                    const points = Number(data.points) || 0;
                    if (points > 1000) return; 
                    if(uid) {
                        userScores[uid] = (userScores[uid] || 0) + points;
                    }
                });

                const sortedEntries = Object.entries(userScores)
                    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
                    .slice(0, 3);

                const topUsers: UserProfile[] = [];
                for (const [uid, calculatedDailyScore] of sortedEntries) {
                    if(calculatedDailyScore <= 0) continue;
                    const userDoc = await getDoc(doc(db, 'users', uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as UserProfile;
                        topUsers.push({ 
                            ...userData, 
                            uid, 
                            score: calculatedDailyScore 
                        }); 
                    }
                }
                setDailyTop(topUsers);
            } catch (error) {
                console.error("Günlük liderlik hatası:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDailyTop();
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
                            <div key={student.uid || index} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors border border-white/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex items-center justify-center bg-black/40 rounded-lg border border-white/10">{rankIcons[index]}</div>
                                    <div className="flex items-center gap-3">
                                         <UserAvatar user={student} className="w-10 h-10 border-2 border-white/10"/>
                                         <div>
                                             <p className="font-bold text-white text-sm">{student.displayName}</p>
                                             <p className="text-white/40 text-xs font-mono">Bugün</p>
                                         </div>
                                    </div>
                                </div>
                                <div className="bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                                    <p className="font-bold text-amber-400 text-sm">+{student.score} XP</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : ( <div className="text-center py-8"><p className="text-white/40 text-sm">Bugün henüz kimse puan kazanmadı.</p></div> )}
            </div>
        </Card>
    )
}

// --- TASARIMI KORUNAN: STANDART BUTON KARTI ---
const DashboardCardButton = ({ href, icon, title, subtitle, colorClass, badge }: { href: string, icon: React.ReactNode, title: string, subtitle?: string, colorClass: string, badge?: number }) => {
     const colors: {[key: string]: string} = {
        "sky": "from-sky-500 to-blue-600 border-sky-600 shadow-sky-900/40", 
        "rose": "from-rose-500 to-pink-600 border-rose-600 shadow-rose-900/40",
        "orange": "from-orange-500 to-amber-600 border-orange-600 shadow-orange-900/40", 
        "indigo": "from-indigo-500 to-violet-600 border-indigo-600 shadow-indigo-900/40",
        "emerald": "from-emerald-500 to-green-600 border-emerald-600 shadow-emerald-900/40", 
        "violet": "from-violet-500 to-purple-600 border-violet-600 shadow-violet-900/40",
        "teal": "from-teal-500 to-cyan-600 border-teal-600 shadow-teal-900/40",
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

function PageContent() {
  // logout fonksiyonunu useAuth'tan çekiyoruz
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [liveScore, setLiveScore] = useState(0);
  const [stats, setStats] = useState({ totalCourses: 0, generalRank: 0, classRank: 0, branchRank: 0, todayScore: 0 });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });
  const [canSpinWheel, setCanSpinWheel] = useState(false);
  const [localStreak, setLocalStreak] = useState(0);

  // Çıkış Yapma Fonksiyonu
  const handleLogout = async () => {
    try {
        if (logout) {
            await logout();
        } else {
            // Eğer auth context'inizde logout yoksa standart firebase çıkışı yedeği:
            const { getAuth, signOut } = await import('firebase/auth');
            await signOut(getAuth());
        }
        router.push('/login'); // Çıkıştan sonra yönlendirilecek sayfa
    } catch (error) {
        console.error("Çıkış yapılırken bir hata oluştu:", error);
    }
  };

  // CANLI PUAN DİNLEYİCİSİ
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data();
            setLiveScore(userData.score || 0);
            setLocalStreak(userData.currentStreak || 0);
        }
    });
    return () => unsubscribe();
  }, [user]);

  // STREAK KONTROLÜ (useEffect ile güvenli çağrı)
  useEffect(() => {
    const checkStreak = async () => {
        if (!user?.uid) return;
        try {
            const res = await forceStreakCheck(user.uid);
            setCanSpinWheel(res.canSpinWheel);
        } catch(e) { console.error(e); }
    };
    checkStreak();
  }, [user]);

  // VERİLERİ ÇEK
  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) { setIsLoading(false); return; };

      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const [classesSnapshot, allCoursesSnapshot, allUsersSnapshot, examsSnapshot, todayScoreSnapshot] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(collection(db, "courses")),
          getDocs(query(collection(db, "users"), where("role", "==", "student"))),
          getStudentExams(user.uid),
          getDocs(query(collection(db, 'scoreEvents'), 
            where('userId', '==', user.uid), 
            where('timestamp', '>=', Timestamp.fromDate(startOfDay)), 
            where('timestamp', '<=', Timestamp.fromDate(endOfDay))
          ))
        ]);
        
        if (examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter((a: any) => !a.solvedEvent).length;
            setExamStats({ pending, solved: examsSnapshot.data.length - pending });
        }

        const todayTotalScore = todayScoreSnapshot.docs.reduce((sum, doc) => sum + (doc.data().points || 0), 0);
        const allStudents = allUsersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & {uid: string}));
        const sortedAllStudents = [...allStudents].sort((a,b) => (b.score || 0) - (a.score || 0));
        
        let classRank = 0; let branchRank = 0;
        if(user.class) {
            const gradeName = user.class.split(' - ')[0];
            classRank = allStudents.filter(s => s.class?.startsWith(gradeName)).sort((a,b) => (b.score || 0) - (a.score || 0)).findIndex(s => s.uid === user.uid) + 1;
            branchRank = allStudents.filter(s => s.class === user.class).sort((a,b) => (b.score || 0) - (a.score || 0)).findIndex(s => s.uid === user.uid) + 1;
        }

        setStats({ 
            totalCourses: allCoursesSnapshot.size, 
            generalRank: sortedAllStudents.findIndex(s => s.uid === user.uid) + 1, 
            classRank, 
            branchRank, 
            todayScore: todayTotalScore 
        });

      } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }
    fetchData();
  }, [user]);

  if (isLoading) return <div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-indigo-500" /></div>;

  const level = Math.floor(liveScore / 1000) + 1;
  const progressToNextLevel = ((liveScore % 1000) / 1000) * 100;
  const dailyGoal = 500;
  const progressToDailyGoal = Math.min((stats.todayScore / dailyGoal) * 100, 100);
  const isGoalReached = stats.todayScore >= dailyGoal;
  const daysToNextSpin = 7 - (localStreak % 7);

  return (
    <div className="min-h-full bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-32 md:pb-12 text-white font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 pointer-events-none z-0"><div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-indigo-900/20 rounded-full blur-[150px]" /><div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-cyan-900/10 rounded-full blur-[150px]" /></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
           {/* Profil Kartı */}
           <div className="relative w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group">
               {/* ÇIKIŞ YAP BUTONU */}
               <Button
                   onClick={handleLogout}
                   variant="ghost"
                   size="icon"
                   className="absolute top-4 right-4 md:top-6 md:right-6 z-20 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                   title="Çıkış Yap"
               >
                   <LogOut className="h-5 w-5" />
               </Button>
               
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

                   <div className="flex-1 text-center md:text-left w-full pt-4 md:pt-0">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                           <div>
                               <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md pr-8 md:pr-0">{user?.displayName}</h1>
                               <div className="flex items-center flex-wrap justify-center md:justify-start gap-x-3 gap-y-1 mt-3 text-slate-300 font-medium">
                                   <span className="flex items-center gap-2"><Backpack className="h-4 w-4 text-indigo-400" />{user?.class || 'Sınıfsız'}</span>
                                   {user?.schoolName && <><span className="text-slate-600">•</span><span className="flex items-center gap-2"><School className="h-4 w-4 text-cyan-400" />{user.schoolName}</span></>}
                                   <span className="hidden md:inline text-slate-600">•</span>
                                   <span className="hidden md:inline text-indigo-300">{stats.totalCourses} Ders</span>
                               </div>
                           </div>
                           <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:gap-4 mt-4 md:mt-0">
                               <div className="relative group overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-black/60 p-3 md:p-4 flex flex-col items-center justify-center gap-1 shadow-xl">
                                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Trophy className="w-12 h-12 text-amber-500" /></div>
                                   <div className="flex items-center gap-2 mb-1">
                                       <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 shadow-inner"><Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" /></div>
                                       <span className="text-[10px] font-bold text-amber-200/80 uppercase tracking-widest">TOPLAM XP</span>
                                   </div>
                                   <div className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-amber-200 tabular-nums tracking-tight">{liveScore.toLocaleString()}</div>
                               </div>
                               <div className="relative group overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-black/60 p-3 md:p-4 flex flex-col items-center justify-center gap-1 shadow-xl">
                                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Flame className="w-12 h-12 text-orange-500" /></div>
                                   <div className="flex items-center gap-2 mb-1">
                                       <div className="p-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 shadow-inner"><Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-500" /></div>
                                       <span className="text-[10px] font-bold text-orange-200/80 uppercase tracking-widest">GÜNLÜK SERİ</span>
                                   </div>
                                   <div className="flex items-baseline gap-1"><span className="text-lg sm:text-lg md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-orange-200 tabular-nums tracking-tight">{localStreak}</span><span className="text-xs font-bold text-orange-400/60 uppercase">Gün</span></div>
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
           
           {/* GÜNLÜK GÖREV KARTI */}
            <div className="relative w-full rounded-3xl p-[1px] bg-gradient-to-r from-emerald-500/50 via-slate-500/30 to-indigo-500/50 shadow-2xl group overflow-hidden">
                <div className={cn("absolute inset-0 opacity-20 transition-all duration-1000", isGoalReached ? "bg-emerald-600 blur-xl" : "bg-slate-900")}></div>
                <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-[23px] p-6 md:p-8 overflow-hidden">
                    <div className="absolute -right-6 -top-6 text-white/5 rotate-12 pointer-events-none"><Target className="w-48 h-48" /></div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
                        <div className="flex items-center gap-5 w-full md:w-auto z-10">
                            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center border-2 shadow-2xl transition-all duration-500", isGoalReached ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-400")}>
                                {isGoalReached ? <Crown className="w-8 h-8 animate-bounce" /> : <Target className="w-8 h-8" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-wide uppercase flex items-center gap-2">GÜNLÜK HEDEF {isGoalReached && <span className="text-[10px] bg-emerald-500 text-black px-2 py-0.5 rounded-full font-bold animate-pulse">TAMAMLANDI</span>}</h3>
                                <div className="flex items-baseline gap-1 mt-1"><span className={cn("text-2xl font-bold tabular-nums", isGoalReached ? "text-emerald-400" : "text-white")}>{stats.todayScore}</span><span className="text-sm font-medium text-slate-500">/ {dailyGoal} XP</span></div>
                            </div>
                        </div>
                        <div className="flex-1 w-full z-10">
                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 tracking-wider"><span>İLERLEME DURUMU</span><span className={cn(isGoalReached ? "text-emerald-400" : "text-white")}>{Math.floor(progressToDailyGoal)}%</span></div>
                            <div className="h-5 w-full bg-slate-950 rounded-full border border-white/10 p-1 relative shadow-inner"><div className={cn("h-full rounded-full relative overflow-hidden transition-all duration-1000 ease-out flex items-center justify-end pr-1", isGoalReached ? "bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_20px_rgba(16,185,129,0.6)]" : "bg-gradient-to-r from-indigo-500 to-blue-500")} style={{ width: `${progressToDailyGoal}%` }}><div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripes_1s_linear_infinite]" /><div className="h-full w-2 bg-white/50 blur-[2px] rounded-full absolute right-0" /></div></div>
                            {isGoalReached && !canSpinWheel && (<div className="flex items-center justify-center md:justify-start gap-1.5 mt-2.5"><Gift className="w-3 h-3 text-pink-500" /><p className="text-[11px] font-medium text-slate-400">Hediye çarkına son <span className="text-pink-400 font-bold">{daysToNextSpin}</span> gün!</p></div>)}
                        </div>
                        <div className="w-full md:w-auto z-10 flex justify-end">
                            {canSpinWheel ? (
                                <Button asChild className="w-full md:w-auto h-12 bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white font-black border-2 border-white/20 shadow-[0_0_30px_rgba(236,72,153,0.5)] animate-[pulse_2s_infinite]"><Link href="/student/wheel" className="flex items-center gap-2 px-6"><Gift className="h-6 w-6 animate-bounce" /><span className="tracking-wide uppercase">ÇARKI ÇEVİR!</span></Link></Button>
                            ) : isGoalReached ? (
                                <div className="w-full md:w-auto h-12 px-6 bg-slate-800/80 rounded-xl border border-white/10 flex items-center justify-center gap-3 text-emerald-400 shadow-lg"><Timer className="h-5 w-5" /><div className="text-left leading-tight"><span className="block text-xs font-bold text-slate-400 uppercase">Sonraki Görev</span><span className="font-bold text-sm">YARIN BEKLENİYORSUN</span></div></div>
                            ) : (
                                <div className="w-full md:w-auto h-12 px-6 bg-slate-800 rounded-xl border border-slate-700/50 flex items-center justify-center gap-3 text-slate-400 group-hover:bg-slate-700/80 transition-colors"><div className="relative"><div className="h-2 w-2 rounded-full bg-slate-500 animate-ping absolute inset-0 opacity-75"></div><div className="h-2 w-2 rounded-full bg-slate-400 relative"></div></div><span className="font-bold text-sm uppercase">{Math.max(0, dailyGoal - stats.todayScore)} XP KALDI</span></div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Link href="/student/soru-bankasi" className="group block h-full">
                <div className="relative h-full rounded-3xl overflow-hidden bg-gradient-to-br from-sky-900 to-blue-900 border border-sky-500/30 shadow-2xl hover:scale-[1.02] p-8 flex flex-col transition-transform duration-300">
                    <div className="flex justify-between items-start mb-6"><div className="p-4 bg-sky-500/20 rounded-2xl border border-sky-400/30"><Map className="h-8 w-8 text-sky-300" /></div></div>
                    <h2 className="text-3xl font-black text-white mb-2">Macera <span className="text-sky-400">Haritası</span></h2>
                    <p className="text-sky-100/70 font-medium mb-8">Soruları çöz ve ilerle.</p>
                    <div className="mt-auto flex items-center gap-2 text-white font-bold text-lg">Hemen Başla <ArrowRight className="h-5 w-5" /></div>
                </div>
             </Link>
             
             <Link href="/leaderboard" className="group block h-full">
                <div className="relative h-full rounded-3xl overflow-hidden bg-gradient-to-br from-amber-900 to-orange-900 border border-amber-500/30 shadow-2xl hover:scale-[1.02] p-8 flex flex-col transition-transform duration-300">
                    <div className="flex justify-between items-start mb-6"><div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-400/30"><Trophy className="h-8 w-8 text-amber-300" /></div></div>
                    <h2 className="text-3xl font-black text-white mb-2">Şöhret <span className="text-amber-400">Salonu</span></h2>
                    <div className="mt-auto grid grid-cols-3 gap-3">
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center"><span className="text-2xl font-black text-white">#{stats.generalRank}</span><span className="text-[10px] text-amber-200/60 uppercase tracking-tighter">Genel</span></div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center"><span className="text-2xl font-black text-white">#{stats.classRank}</span><span className="text-[10px] text-amber-200/60 uppercase tracking-tighter">Sınıf</span></div>
                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col items-center"><span className="text-2xl font-black text-white">#{stats.branchRank}</span><span className="text-[10px] text-amber-200/60 uppercase tracking-tighter">Şube</span></div>
                    </div>
                </div>
             </Link>
         </div>

         <Link href="/student/gorevler" className="group block w-full mt-6">
            <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-fuchsia-900 to-purple-900 border border-fuchsia-500/30 shadow-2xl hover:scale-[1.01] transition-transform duration-300 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="p-5 bg-fuchsia-500/20 rounded-2xl border border-fuchsia-400/30 shrink-0"><Compass className="h-10 w-10 text-fuchsia-300" /></div>
                    <div><h2 className="text-3xl font-black text-white mb-1">Görev <span className="text-fuchsia-400">Yolculuğu</span></h2><p className="text-fuchsia-100/70 font-medium">Oyunlaştırılmış müfredat ile seviye atla.</p></div>
                </div>
                <div className="flex items-center gap-2 text-white font-bold text-lg bg-fuchsia-600/20 px-6 py-3 rounded-xl border border-fuchsia-500/50 group-hover:bg-fuchsia-600/40 transition-colors">Yolculuğa Çık <ArrowRight className="h-5 w-5" /></div>
            </div>
         </Link>

         <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
               <DashboardCardButton href="/oyunlar" icon={<Gamepad2 />} title="Etkinlikler" subtitle="Arcade Oyunlar" colorClass="sky" />
               <DashboardCardButton href="/student/yarismalar" icon={<Swords />} title="Arena" subtitle="Çok Oyunculu Yarış" colorClass="rose" />
               <DashboardCardButton href="/student/yazilacaklar" icon={<Columns />} title="Panolar" subtitle="Notlarım" colorClass="orange" />
               <DashboardCardButton href="/student/ozetler" icon={<LayoutTemplate />} title="Özetler" subtitle="Ders Notları" colorClass="indigo" />
               <DashboardCardButton href="/student/shop" icon={<ShoppingCart />} title="Mağaza" subtitle="Puan Harca" colorClass="emerald" />
               <DashboardCardButton href="/student/deneme" icon={<FileCog />} title="Denemeler" subtitle="Sınav Merkezi" colorClass="violet" badge={examStats.pending} />
         </div>
         
         <HardestWorkersToday />
      </div>
      
      <style jsx global>{`
        @keyframes progress-stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}

// KRİTİK: Next.js ana bileşen olarak dışa aktarılmalı
export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-950"><Loader2 className="h-16 w-16 animate-spin text-indigo-500" /></div>}>
      <PageContent />
    </Suspense>
  )
}