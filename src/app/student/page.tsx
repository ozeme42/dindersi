'use client';

import React, { useState, useEffect, Suspense } from "react";
import { 
    Trophy, Star, Gamepad2, ShoppingCart, Columns, LayoutTemplate, 
    FileCog, Crown, Award, Target, Sparkles, Map, Swords, Backpack,
    Loader2, ArrowRight, Flame, Gift, Timer, School, Compass, LogOut,
    Home, User, ChevronRight, Zap, BookOpen, Lock
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp, onSnapshot, doc, getDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { getStudentExams } from "@/app/student/deneme/actions";
import { forceStreakCheck } from "@/app/student/actions"; 
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";

// ===================== GÜNLÜK LİDERLİK =====================
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
                const q = query(collection(db, 'scoreEvents'), where('timestamp', '>=', Timestamp.fromDate(startOfDay)), where('timestamp', '<=', Timestamp.fromDate(endOfDay)));
                const snapshot = await getDocs(q);
                const userScores: Record<string, number> = {};
                snapshot.docs.forEach(d => {
                    const data = d.data(); const uid = data.userId; const points = Number(data.points) || 0;
                    if(uid) userScores[uid] = (userScores[uid] || 0) + points;
                });
                const sortedEntries = Object.entries(userScores).sort(([,a],[,b]) => b-a).slice(0,3);
                const topUsers: UserProfile[] = [];
                for (const [uid, calculatedDailyScore] of sortedEntries) {
                    if(calculatedDailyScore <= 0) continue;
                    const userDoc = await getDoc(doc(db, 'users', uid));
                    if(userDoc.exists()) topUsers.push({ ...userDoc.data() as UserProfile, uid, score: calculatedDailyScore });
                }
                setDailyTop(topUsers);
            } catch(e) { console.error(e); } finally { setIsLoading(false); }
        };
        fetchDailyTop();
    }, []);

    const rankConfig = [
        { label: '🥇', color: 'from-yellow-400 to-amber-600', text: 'text-yellow-300', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]' },
        { label: '🥈', color: 'from-slate-300 to-slate-500', text: 'text-slate-300', glow: '' },
        { label: '🥉', color: 'from-orange-400 to-orange-600', text: 'text-orange-300', glow: '' },
    ];

    return (
        <section>
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-white font-black text-sm uppercase tracking-[0.15em] flex items-center gap-2">
                    <span className="w-1 h-4 bg-amber-400 rounded-full inline-block" />
                    Günün Efsaneleri
                </h2>
                <Link href="/leaderboard" className="text-indigo-400 text-xs font-bold flex items-center gap-0.5 hover:text-indigo-300 transition-colors">
                    Tümü <ChevronRight className="h-3 w-3" />
                </Link>
            </div>
            <div className="rounded-3xl overflow-hidden border border-white/8 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-2xl shadow-2xl divide-y divide-white/5">
                {isLoading ? (
                    [1,2,3].map(i => <div key={i} className="p-4"><Skeleton className="h-14 w-full rounded-2xl bg-white/5" /></div>)
                ) : dailyTop.length > 0 ? dailyTop.map((student, i) => (
                    <div key={student.uid || i} className={cn("flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors group", i === 0 && "bg-amber-500/5")}>
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">{rankConfig[i].label}</span>
                            <div className="relative">
                                <UserAvatar user={student} className={cn("w-11 h-11 border-2 border-white/10", i === 0 && "border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]")}/>
                            </div>
                            <div>
                                <p className="font-black text-white text-sm">{student.displayName}</p>
                                <p className="text-white/30 text-xs font-medium">Bugün</p>
                            </div>
                        </div>
                        <div className={cn("px-4 py-1.5 rounded-full border", i === 0 ? "bg-amber-500/15 border-amber-500/30" : "bg-white/5 border-white/10")}>
                            <p className={cn("font-black text-sm tabular-nums", rankConfig[i].text)}>+{student.score} XP</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10"><p className="text-white/30 text-sm">Bugün henüz kimse puan kazanmadı.</p></div>
                )}
            </div>
        </section>
    );
}

// ===================== ALT MENÜ =====================
function BottomNav({ examBadge }: { examBadge: number }) {
    const pathname = usePathname();
    const tabs = [
        { href: '/student', icon: Home, label: 'Ana Sayfa' },
        { href: '/student/soru-bankasi', icon: Map, label: 'Harita' },
        { href: '/leaderboard', icon: Trophy, label: 'Liderlik' },
        { href: '/student/shop', icon: ShoppingCart, label: 'Mağaza' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* blur bg */}
            <div className="absolute inset-0 bg-[#0a081e]/90 backdrop-blur-2xl border-t border-white/8" />
            <div className="relative flex items-end justify-around px-2 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
                {tabs.map(tab => {
                    const isActive = pathname === tab.href;
                    const Icon = tab.icon;
                    return (
                        <Link key={tab.href} href={tab.href} className="flex flex-col items-center justify-center gap-1 px-3 py-1 relative min-w-[60px] group">
                            {isActive && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                            )}
                            <div className={cn(
                                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300",
                                isActive
                                    ? "bg-indigo-600/30 border border-indigo-500/50 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-110"
                                    : "text-slate-600 group-hover:text-slate-400"
                            )}>
                                <Icon className="h-5 w-5" />
                                {tab.href === '/student/deneme' && examBadge > 0 && (
                                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-950">{examBadge}</span>
                                )}
                            </div>
                            <span className={cn("text-[10px] font-bold transition-colors leading-none", isActive ? "text-indigo-400" : "text-slate-600")}>{tab.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

function DesktopSidebar({ examBadge, handleLogout }: { examBadge: number, handleLogout: () => void }) {
    const pathname = usePathname();
    const tabs = [
        { href: '/student', icon: Home, label: 'Ana Sayfa' },
        { href: '/student/soru-bankasi', icon: Map, label: 'Macera Haritası' },
        { href: '/student/gorevler', icon: Compass, label: 'Görev Yolculuğu' },
        { href: '/leaderboard', icon: Trophy, label: 'Liderlik' },
        { href: '/student/shop', icon: ShoppingCart, label: 'Mağaza' },
        { href: '/student/profile', icon: User, label: 'Profil' },
    ];
    return (
        <aside className="hidden md:flex flex-col fixed top-0 left-0 w-72 h-screen bg-[#0a081e]/90 backdrop-blur-2xl border-r border-white/8 z-50 p-6 overflow-y-auto">
            <div className="flex items-center gap-3 mb-10 mt-2 px-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-wide leading-tight">Din Dersi<br/><span className="text-emerald-400">Atölyesi</span></h1>
            </div>
            
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Ana Menü</div>
            <nav className="flex-1 flex flex-col gap-2">
                {tabs.map(tab => {
                    const isActive = pathname === tab.href;
                    const Icon = tab.icon;
                    return (
                        <Link key={tab.href} href={tab.href} className={cn(
                            "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 font-bold",
                            isActive 
                                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                                : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                        )}>
                            <div className="relative">
                                <Icon className={cn("w-6 h-6 transition-transform", isActive && "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] scale-110")} />
                                {tab.href === '/student/deneme' && examBadge > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-950">{examBadge}</span>
                                )}
                            </div>
                            <span className="text-base">{tab.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
                <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-4 px-4 py-4 h-auto text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-2xl transition-colors font-bold border border-transparent">
                    <LogOut className="w-6 h-6" />
                    <span className="text-base">Çıkış Yap</span>
                </Button>
            </div>
        </aside>
    );
}

// ===================== ANA SAYFA =====================
function PageContent() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [liveScore, setLiveScore] = useState(0);
  const [stats, setStats] = useState({ totalCourses: 0, generalRank: 0, classRank: 0, branchRank: 0, todayScore: 0 });
  const [examStats, setExamStats] = useState<{ pending: number, solved: number }>({ pending: 0, solved: 0 });
  const [canSpinWheel, setCanSpinWheel] = useState(false);
  const [localStreak, setLocalStreak] = useState(0);

  const handleLogout = async () => {
    try {
        if (logout) await logout();
        else { const { getAuth, signOut } = await import('firebase/auth'); await signOut(getAuth()); }
        router.push('/login');
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if (loading || !user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (s) => {
        if(s.exists()) { setLiveScore(s.data().score || 0); setLocalStreak(s.data().currentStreak || 0); }
    });
    return () => unsub();
  }, [user, loading]);

  useEffect(() => {
    const check = async () => {
        if (loading || !user?.uid) return;
        try { const res = await forceStreakCheck(user.uid); setCanSpinWheel(res.canSpinWheel); } catch(e) {}
    };
    check();
  }, [user, loading]);

  useEffect(() => {
    async function fetchData() {
      if (loading) return;
      if (!user?.uid) { setIsLoading(false); router.push('/login'); return; }
      setIsLoading(true);
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const [, allCoursesSnapshot, allUsersSnapshot, examsSnapshot, todayScoreSnapshot] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("createdAt", "asc"))),
          getDocs(collection(db, "courses")),
          getDocs(query(collection(db, "users"), where("role", "==", "student"))),
          getStudentExams(user.uid),
          getDocs(query(collection(db, 'scoreEvents'), where('userId', '==', user.uid), where('timestamp', '>=', Timestamp.fromDate(startOfDay)), where('timestamp', '<=', Timestamp.fromDate(endOfDay))))
        ]);
        if(examsSnapshot.success && examsSnapshot.data) {
            const pending = examsSnapshot.data.filter((a: any) => !a.solvedEvent).length;
            setExamStats({ pending, solved: examsSnapshot.data.length - pending });
        }
        const todayTotal = todayScoreSnapshot.docs.reduce((s, d) => s + (d.data().points || 0), 0);
        const allStudents = allUsersSnapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile & {uid: string}));
        const sorted = [...allStudents].sort((a,b) => (b.score||0)-(a.score||0));
        let classRank = 0, branchRank = 0;
        if(user.class) {
            const grade = user.class.split(' - ')[0];
            classRank = allStudents.filter(s => s.class?.startsWith(grade)).sort((a,b) => (b.score||0)-(a.score||0)).findIndex(s => s.uid === user.uid) + 1;
            branchRank = allStudents.filter(s => s.class === user.class).sort((a,b) => (b.score||0)-(a.score||0)).findIndex(s => s.uid === user.uid) + 1;
        }
        setStats({ totalCourses: allCoursesSnapshot.size, generalRank: sorted.findIndex(s => s.uid === user.uid)+1, classRank, branchRank, todayScore: todayTotal });
      } catch(e) { console.error(e); } finally { setIsLoading(false); }
    }
    fetchData();
  }, [user, loading, router]);

  if (loading || isLoading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#09071a]">
        <div className="flex flex-col items-center gap-5">
            <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 opacity-30 blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-700/30 border border-indigo-500/30 flex items-center justify-center">
                    <Sparkles className="h-9 w-9 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
            </div>
            <p className="text-indigo-300/60 font-bold text-xs tracking-[0.3em] uppercase animate-pulse">Yükleniyor</p>
        </div>
    </div>
  );

  const level = Math.floor(liveScore / 1000) + 1;
  const progressToNextLevel = ((liveScore % 1000) / 1000) * 100;
  const xpToNextLevel = 1000 - (liveScore % 1000);
  const dailyGoal = 500;
  const progressToDailyGoal = Math.min((stats.todayScore / dailyGoal) * 100, 100);
  const isGoalReached = stats.todayScore >= dailyGoal;

  return (
    <div className="min-h-screen bg-[#09071a] text-white font-sans overflow-x-hidden">

        {/* ════════ ARKA PLAN ════════ */}
        <div className="fixed inset-0 pointer-events-none z-0">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-900/30 rounded-full blur-[140px]" />
            <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-fuchsia-900/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 -left-20 w-[350px] h-[350px] bg-cyan-900/15 rounded-full blur-[120px]" />
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>

        {/* ════════ YAPIŞIK ÜST BAR ════════ */}
        <header className="sticky top-0 z-40 md:ml-72">
            <div className="absolute inset-0 bg-[#09071a]/70 backdrop-blur-2xl border-b border-white/5" />
            <div className="relative w-full max-w-lg md:max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
                {/* Avatar */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-2xl p-[2px] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 shadow-[0_0_16px_rgba(251,146,60,0.4)]">
                            <div className="w-full h-full rounded-[14px] overflow-hidden border-[1.5px] border-slate-900 bg-slate-900">
                                <UserAvatar user={user} className="w-full h-full" />
                            </div>
                        </div>
                        <div className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-[1.5px] border-[#09071a] leading-none shadow-lg">
                            Sv.{level}
                        </div>
                    </div>
                    <div className="min-w-0">
                        <p className="text-slate-500 text-[10px] font-bold leading-none mb-1 uppercase tracking-wider">Hoş geldin</p>
                        <p className="text-white font-black text-sm truncate leading-none">{user?.displayName}</p>
                    </div>
                </div>
                {/* Stats pills */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-500/20 rounded-xl px-3 py-1.5 shadow-[0_0_12px_rgba(249,115,22,0.15)]">
                        <Flame className="h-3.5 w-3.5 text-orange-400 fill-orange-500" />
                        <span className="font-black text-white text-sm tabular-nums leading-none">{localStreak}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                        <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-black text-amber-300 text-sm tabular-nums leading-none">{liveScore.toLocaleString()}</span>
                    </div>
                    <Button onClick={handleLogout} variant="ghost" size="icon" className="w-8 h-8 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </header>

        {/* ════════ ANA İÇERİK ════════ */}
        <main className="w-full max-w-lg md:max-w-7xl mx-auto px-4 md:px-8 pt-5 pb-36 md:ml-72 space-y-6 md:space-y-8 relative z-10">

            {/* ── BÜYÜK PROFİL HERO KARTI ── */}
            <section className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_20px_80px_rgba(99,102,241,0.3)] group">
                {/* Gradyan arka plan */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-purple-900/60 to-slate-900/90 transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.3),transparent_60%)]" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
                
                {/* İçerik */}
                <div className="relative p-5 md:p-8 space-y-6 md:space-y-0 md:flex md:items-center md:gap-8">
                    
                    {/* Masaüstü Sol Bölüm: Sınıf & Okul & Genel Seviye */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-indigo-300 text-xs md:text-sm font-bold bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1">
                                <Backpack className="h-3 w-3 md:h-4 md:w-4" />{user?.class || 'Sınıfsız'}
                            </span>
                            {user?.schoolName && (
                                <span className="flex items-center gap-1.5 text-cyan-300 text-xs md:text-sm font-bold bg-cyan-500/10 border border-cyan-500/20 rounded-full px-3 py-1">
                                    <School className="h-3 w-3 md:h-4 md:w-4" />{user.schoolName}
                                </span>
                            )}
                        </div>

                        {/* Seviye barı */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                                        <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-400" />
                                    </div>
                                    <span className="text-white font-black text-sm md:text-base">Seviye {level}</span>
                                </div>
                                <span className="text-slate-400 text-xs md:text-sm font-medium tabular-nums">{xpToNextLevel} XP kaldı</span>
                            </div>
                            <div className="h-2.5 md:h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.6)] transition-all duration-1000"
                                    style={{ width: `${progressToNextLevel}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Günlük hedef */}
                    <div className={cn("flex-1 rounded-2xl p-4 md:p-5 border transition-colors", isGoalReached ? "bg-emerald-500/10 border-emerald-500/25" : "bg-white/3 border-white/8")}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {isGoalReached
                                    ? <Crown className="h-4 w-4 md:h-5 md:w-5 text-emerald-400 animate-bounce" />
                                    : <Target className="h-4 w-4 md:h-5 md:w-5 text-slate-400" />
                                }
                                <span className={cn("font-black text-sm md:text-base", isGoalReached ? "text-emerald-300" : "text-white")}>
                                    Günlük Hedef
                                    {isGoalReached && <span className="ml-2 text-[9px] md:text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded-full font-black">✓ TAMAM</span>}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={cn("font-black text-sm md:text-base tabular-nums", isGoalReached ? "text-emerald-400" : "text-white")}>
                                    {stats.todayScore}<span className="text-slate-500 font-medium">/{dailyGoal}</span>
                                </span>
                                {canSpinWheel && (
                                    <Button asChild size="sm" className="h-7 md:h-8 px-3 bg-gradient-to-r from-pink-600 to-orange-500 font-black text-xs md:text-sm border-0 animate-pulse shadow-[0_0_20px_rgba(236,72,153,0.5)] rounded-xl">
                                        <Link href="/student/wheel"><Gift className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />Çark!</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="h-2.5 md:h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden", isGoalReached ? "bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "bg-gradient-to-r from-amber-500 to-orange-400")}
                                style={{ width: `${progressToDailyGoal}%` }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:14px_14px] animate-[progress-stripes_1s_linear_infinite]" />
                            </div>
                        </div>
                    </div>

                    {/* Sıralama rozetleri */}
                    <div className="flex-1 grid grid-cols-3 gap-2.5 md:gap-4">
                        {[
                            { label: '🌍 Genel', value: stats.generalRank },
                            { label: '🏫 Sınıf', value: stats.classRank },
                            { label: '🏆 Şube', value: stats.branchRank },
                        ].map(item => (
                            <div key={item.label} className="bg-black/30 rounded-2xl p-3 md:p-4 border border-white/8 flex flex-col items-center justify-center gap-0.5 md:gap-1 backdrop-blur-sm shadow-inner">
                                <span className="text-white font-black text-xl md:text-3xl tabular-nums">#{item.value || '-'}</span>
                                <span className="text-slate-500 text-[9px] md:text-xs uppercase tracking-wider font-bold">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="md:grid md:grid-cols-12 md:gap-8 space-y-6 md:space-y-0">
                {/* SOL KOLON: Ana Görevler ve Keşfet */}
                <div className="md:col-span-8 space-y-6 md:space-y-8">
                    {/* ── BÜYÜK İŞLEM KARTLARI ── */}
            <section>
                <h2 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-indigo-400 rounded-full" />Başla
                </h2>
                <div className="space-y-3">
                    {/* Macera Haritası */}
                    <Link href="/student/soru-bankasi">
                        <div className="group relative rounded-3xl overflow-hidden border border-sky-500/30 shadow-[0_12px_40px_rgba(14,165,233,0.3)] active:scale-[0.98] transition-all duration-200 cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.2),transparent_55%)]" />
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/25 rounded-b-3xl" />
                            {/* Dekoratif ikon */}
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <Map className="w-32 h-32" />
                            </div>
                            <div className="relative p-5 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <Map className="h-8 w-8 text-white drop-shadow-lg" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-white text-2xl leading-tight drop-shadow-md">Macera Haritası</p>
                                    <p className="text-sky-200/70 text-sm font-semibold mt-0.5">Soruları çöz, bölgeleri aç</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform duration-300">
                                    <ArrowRight className="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* Görev Yolculuğu */}
                    <Link href="/student/gorevler">
                        <div className="group relative rounded-3xl overflow-hidden border border-fuchsia-500/30 shadow-[0_12px_40px_rgba(192,38,211,0.3)] active:scale-[0.98] transition-all duration-200 cursor-pointer">
                            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 via-purple-700 to-violet-800" />
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.18),transparent_55%)]" />
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/25 rounded-b-3xl" />
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <Compass className="w-32 h-32" />
                            </div>
                            <div className="relative p-5 flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                                    <Compass className="h-8 w-8 text-white drop-shadow-lg" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-white text-2xl leading-tight drop-shadow-md">Görev Yolculuğu</p>
                                    <p className="text-fuchsia-200/70 text-sm font-semibold mt-0.5">Müfredatı gamifike et</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform duration-300">
                                    <ArrowRight className="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </section>

            {/* ── KÜÇÜK KARTLAR ── */}
            <section>
                <h2 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-fuchsia-400 rounded-full" />Keşfet
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { href:"/oyunlar", icon: <Gamepad2 className="h-6 w-6"/>, title:"Etkinlikler", sub:"Arcade Oyunlar", from:"from-cyan-500", to:"to-blue-600", glow:"rgba(6,182,212,0.35)", border:"border-cyan-500/30", badge:0 },
                        { href:"/student/deneme", icon: <FileCog className="h-6 w-6"/>, title:"Denemeler", sub:"Sınav Merkezi", from:"from-violet-500", to:"to-purple-600", glow:"rgba(139,92,246,0.35)", border:"border-violet-500/30", badge:examStats.pending },
                        { href:"/student/ders-notlari", icon: <BookOpen className="h-6 w-6"/>, title:"Ders Notları", sub:"Panolar & Özetler", from:"from-indigo-500", to:"to-blue-600", glow:"rgba(99,102,241,0.35)", border:"border-indigo-500/30", badge:0 },
                        { href:"/student/shop", icon: <ShoppingCart className="h-6 w-6"/>, title:"Mağaza", sub:"Puan Harca", from:"from-emerald-500", to:"to-green-600", glow:"rgba(16,185,129,0.35)", border:"border-emerald-500/30", badge:0 },
                    ].map(card => (
                        <Link key={card.href} href={card.href}>
                            <div className={cn("group relative rounded-3xl overflow-hidden border active:scale-[0.96] transition-all duration-150 cursor-pointer", card.border)} style={{ boxShadow: `0 8px 30px ${card.glow}` }}>
                                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", card.from, card.to)} />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.18),transparent_60%)]" />
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/25 rounded-b-3xl" />
                                <div className="relative p-4 flex flex-col gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shadow-inner shrink-0 group-hover:scale-110 transition-transform duration-300">
                                        {card.icon}
                                    </div>
                                    <div>
                                        <p className="font-black text-white text-lg leading-tight">{card.title}</p>
                                        <p className="text-white/60 text-xs font-semibold mt-0.5">{card.sub}</p>
                                    </div>
                                </div>
                                {card.badge > 0 && (
                                    <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black min-w-[22px] h-[22px] px-1 rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-bounce border border-red-400/50">
                                        {card.badge}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

                </div>

                {/* SAĞ KOLON: Günün Efsaneleri */}
                <div className="md:col-span-4 space-y-6 md:space-y-8">
                    {/* ── GÜNÜN EFSANELERİ ── */}
                    <HardestWorkersToday />
                </div>
            </div>

        </main>

        {/* MASAÜSTÜ YAN MENÜ */}
        <DesktopSidebar examBadge={examStats.pending} handleLogout={handleLogout} />

        {/* MOBİL ALT MENÜ */}
        <BottomNav examBadge={examStats.pending} />

        <style jsx global>{`
            body { background-color: #09071a; }
            @keyframes progress-stripes {
                0% { background-position: 14px 0; }
                100% { background-position: 0 0; }
            }
        `}</style>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#09071a]">
            <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-2xl bg-indigo-600/20 blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-2xl bg-indigo-900/30 border border-indigo-500/20 flex items-center justify-center">
                    <Sparkles className="h-9 w-9 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
            </div>
        </div>
    }>
      <PageContent />
    </Suspense>
  );
}