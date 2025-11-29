"use client";

import React, { useState, useEffect } from "react";
import { 
    BookOpen, Trophy, Star, Gamepad2, Users, 
    ShoppingCart, Columns, LayoutTemplate, FileCog, 
    Crown, Award, Zap, Target, Sparkles, Map, Swords, Backpack,
    Loader2, Home, User
} from 'lucide-react';

// --- UTILS & MOCKS ---

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(" ");
}

const Link = ({ href, children, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
        {children}
    </a>
);

const useAuth = () => {
    return {
        user: {
            uid: 'student-123',
            displayName: 'Efe Can',
            email: 'efe@okul.com',
            role: 'student',
            class: '6-A',
            score: 15450,
            avatarUrl: null
        },
        loading: false
    };
};

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

const GlassCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn(
        "backdrop-blur-md bg-white/10 border-2 border-white/20 rounded-3xl shadow-2xl overflow-hidden relative",
        className
    )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50"></div>
        {children}
    </div>
);

// --- MOBILE BOTTOM NAVIGATION ---

const MobileNav = () => {
    const [activeTab, setActiveTab] = useState('home');

    const navItems = [
        { id: 'home', icon: Home, label: 'Ana Üs', href: '/student' },
        { id: 'quests', icon: Map, label: 'Görevler', href: '/student/soru-bankasi' },
        { id: 'arena', icon: Swords, label: 'Arena', href: '/student/yarismalar', highlight: true },
        { id: 'rank', icon: Trophy, label: 'Liderlik', href: '/leaderboard' },
        { id: 'profile', icon: User, label: 'Profil', href: '/student/profile' },
    ];

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:hidden">
            <div className="bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-2 py-2 flex justify-between items-center relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none"></div>

                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                                "relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-full",
                                isActive ? "text-white" : "text-indigo-300/60 hover:text-indigo-200"
                            )}
                        >
                            {isActive && (
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-sm" />
                            )}
                            
                            {item.highlight ? (
                                <div className={cn(
                                    "relative -mt-8 p-3 rounded-xl border-2 shadow-lg transition-transform duration-300",
                                    isActive 
                                        ? "bg-gradient-to-br from-amber-400 to-orange-600 border-amber-200 shadow-orange-500/50 scale-110" 
                                        : "bg-slate-800 border-slate-600 shadow-black/50"
                                )}>
                                    <item.icon className={cn("h-6 w-6", isActive ? "text-white" : "text-slate-400")} />
                                </div>
                            ) : (
                                <div className="relative z-10">
                                    <item.icon className={cn(
                                        "h-6 w-6 transition-all duration-300",
                                        isActive ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)] scale-110" : ""
                                    )} />
                                </div>
                            )}

                            {!item.highlight && (
                                <span className={cn(
                                    "text-[10px] font-bold mt-1 transition-all duration-300",
                                    isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 hidden"
                                )}>
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// --- MOCK DATA ---

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
    const [dailyTop, setDailyTop] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDailyTop(MOCK_LEADERBOARD);
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
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
  const [stats, setStats] = useState(MOCK_STATS);
  const [examStats, setExamStats] = useState(MOCK_EXAM_STATS);

  useEffect(() => {
    const timer = setTimeout(() => {
        setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#2b1055]">
            <Loader2 className="h-16 w-16 animate-spin text-indigo-400" />
        </div>
    );
  }

  const lessonProgress = stats.totalTopics > 0 ? Math.round((stats.completedTopics / stats.totalTopics) * 100) : 0;
  
  return (
    <div className="min-h-full bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black p-4 sm:p-6 md:p-8 pb-32 md:pb-12 text-white font-sans selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto space-y-6">
          
          {/* PLAYER HUD HEADER */}
           <GlassCard className="p-1 bg-gradient-to-r from-indigo-900/50 to-purple-900/50">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 md:p-6 relative overflow-hidden">
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
                  
                  <div className="text-center z-10 bg-black/30 p-3 rounded-2xl border border-white/10 min-w-[140px]">
                      <div className="flex items-center justify-center gap-2 text-3xl font-black text-amber-400 drop-shadow-sm">
                          <Star className="h-6 w-6 fill-amber-400 animate-pulse"/>
                          <span>{stats.score.toLocaleString()}</span>
                      </div>
                      <p className="text-xs uppercase tracking-widest text-amber-200/60 font-bold mt-1">Toplam Puan</p>
                  </div>
              </div>
          </GlassCard>
          
          {/* MAIN QUEST BOARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Link href="/student/soru-bankasi" className="group h-full">
                 <GlassCard className="h-full bg-gradient-to-br from-sky-900/40 to-blue-900/40 hover:border-sky-400/50 transition-colors group-hover:bg-sky-900/30">
                      <div className="p-5 flex flex-col h-full relative">
                          <div className="absolute top-4 right-4 bg-sky-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                              <Map className="h-8 w-8 text-sky-400" />
                          </div>
                          
                          <div className="mb-6">
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
              </Link>
            
            <Link href="/leaderboard" className="group h-full">
                <GlassCard className="h-full bg-gradient-to-br from-amber-900/40 to-orange-900/40 hover:border-amber-400/50 transition-colors group-hover:bg-amber-900/30">
                    <div className="p-5 flex flex-col h-full relative">
                        <div className="absolute top-4 right-4 bg-amber-500/20 p-2 rounded-lg group-hover:scale-110 transition-transform">
                             <Trophy className="h-8 w-8 text-amber-400" />
                        </div>

                        <div className="mb-6">
                             <h2 className="text-2xl font-bold text-white mb-1">Şöhret Salonu</h2>
                             <p className="text-amber-200 text-sm">Liderlik Tablosu Sıralaman</p>
                        </div>
                        
                        <div className="mt-auto grid grid-cols-3 gap-2">
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
                    </div>
                </GlassCard>
            </Link>
          </div>

          {/* GAME MODES (PvE / PvP) */}
          <div className="grid grid-cols-2 gap-4 md:gap-6">
                <GameButton href="/student/activities" variant="info" className="flex flex-col gap-2 py-6 h-auto">
                    <Gamepad2 className="h-8 w-8 mb-1"/> 
                    <span>Etkinlikler</span>
                </GameButton>
                 <GameButton href="/student/yarismalar" variant="secondary" className="flex flex-col gap-2 py-6 h-auto">
                    <Swords className="h-8 w-8 mb-1"/> 
                    <span>Çok Oyunculu</span>
                    <span className="text-[10px] opacity-70 font-normal normal-case">PvP Arena</span>
                </GameButton>
          </div>
          
           {/* UTILITY BELT */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <GameButton href="/student/yazilacaklar" variant="orange" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                  <Columns className="h-5 w-5"/> <span>Yazılacaklar</span>
              </GameButton>
              <GameButton href="/student/ozetler" variant="primary" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                  <LayoutTemplate className="h-5 w-5"/> <span>Özetler</span>
              </GameButton>
              <GameButton href="/student/shop" variant="success" className="text-sm flex flex-col md:flex-row gap-2 items-center">
                  <ShoppingCart className="h-5 w-5"/> <span>Puan Dükkanı</span>
              </GameButton>
              <GameButton 
                href="/student/deneme" 
                variant="violet" 
                className="text-sm flex flex-col md:flex-row gap-2 items-center"
                badge={examStats.pending > 0 ? `${examStats.pending} YENİ` : undefined}
              >
                  <FileCog className="h-5 w-5"/> <span>Deneme Sınavı</span>
              </GameButton>
          </div>
          
          <HardestWorkersToday />
          
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <MobileNav />
      
    </div>
  );
}
