
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    Crown, Award, Trophy, Users, List, Flame, Search, 
    Calendar, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Medal, Star, Sparkles, Loader2, BookOpenCheck, LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import Link from 'next/link';
import { getHallOfFameData, getLiveLeaderboard, getGradeLeaderboard, getBranchLeaderboard, HallOfFamePeriod, ClassLeaderboardEntry } from './actions';
import type { UserProfile } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";

// --- UI COMPONENTS ---

const Podium = ({ winners }: { winners: UserProfile[] }) => {
    if (!winners || winners.length === 0) {
        return <div className="text-center py-10 text-slate-400 bg-black/20 rounded-lg">Bu periyot için gösterilecek veri yok.</div>;
    }

    return (
        <div className="flex items-end justify-center gap-4 sm:gap-8 w-full max-w-4xl px-4 mt-12">
            {/* 2ND PLACE */}
            {winners.length > 1 && (
                <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-12 duration-700 delay-100">
                    <div className="mb-4 text-center relative group">
                        <div className="absolute inset-0 bg-slate-400 blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative">
                            <UserAvatar user={winners[1]} className="w-16 h-16 sm:w-20 sm:h-20 text-xl border-4 border-slate-300 shadow-xl mx-auto" />
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1 rounded-full border border-slate-500 whitespace-nowrap">
                                2. Sıra
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="text-white font-bold text-sm sm:text-lg truncate max-w-[120px] sm:max-w-none">{winners[1].displayName}</div>
                            <div className="text-slate-400 text-xs">{winners[1].class}</div>
                        </div>
                    </div>
                    
                    <div className="w-full bg-gradient-to-t from-slate-900 to-slate-700 rounded-t-2xl relative flex flex-col items-center justify-start pt-6 border-t-4 border-slate-400 shadow-[0_0_30px_rgba(148,163,184,0.2)] h-48 sm:h-64 transition-all hover:-translate-y-1">
                        <div className="text-4xl font-black text-slate-500 opacity-30 select-none">2</div>
                        <div className="mt-auto mb-6 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-600/50">
                            <span className="text-white font-mono font-bold">{winners[1].score.toLocaleString()}</span>
                            <span className="text-slate-400 text-xs ml-1">XP</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 1ST PLACE */}
            {winners.length > 0 && (
                <div className="flex flex-col items-center w-1/3 z-10 animate-in slide-in-from-bottom-12 duration-700">
                    <div className="mb-6 text-center relative group">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                            <Crown className="h-10 w-10 text-yellow-400 fill-yellow-400 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
                        </div>
                        <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-30 rounded-full group-hover:opacity-50 transition-opacity"></div>
                        <div className="relative">
                             <UserAvatar user={winners[0]} className="w-20 h-20 sm:w-28 sm:h-28 text-3xl border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] mx-auto" />
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-600 text-yellow-100 text-xs font-bold px-3 py-1 rounded-full border border-yellow-400 whitespace-nowrap shadow-lg">
                                Şampiyon
                            </div>
                        </div>
                        <div className="mt-5">
                            <div className="text-yellow-100 font-bold text-base sm:text-xl truncate max-w-[140px] sm:max-w-none">{winners[0].displayName}</div>
                            <div className="text-yellow-500/80 text-xs">{winners[0].class}</div>
                        </div>
                    </div>
                    
                    <div className="w-full bg-gradient-to-t from-yellow-900/80 to-amber-600 rounded-t-2xl relative flex flex-col items-center justify-start pt-6 border-t-4 border-yellow-400 shadow-[0_0_50px_rgba(245,158,11,0.4)] h-64 sm:h-80 transition-all hover:-translate-y-2">
                        <div className="text-5xl font-black text-yellow-900 opacity-40 select-none">1</div>
                        <div className="mt-auto mb-8 bg-black/40 backdrop-blur-sm px-6 py-2 rounded-xl border border-yellow-500/50 shadow-inner">
                            <span className="text-white font-mono font-black text-lg sm:text-2xl">{winners[0].score.toLocaleString()}</span>
                            <span className="text-yellow-400 text-sm ml-1 font-bold">XP</span>
                        </div>
                    </div>
                </div>
            )}

            {/* 3RD PLACE */}
            {winners.length > 2 && (
                <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-12 duration-700 delay-200">
                    <div className="mb-4 text-center relative group">
                        <div className="absolute inset-0 bg-orange-500 blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                        <div className="relative">
                            <UserAvatar user={winners[2]} className="w-16 h-16 sm:w-20 sm:h-20 text-xl border-4 border-orange-500 shadow-xl mx-auto" />
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-800 text-orange-200 text-xs font-bold px-3 py-1 rounded-full border border-orange-600 whitespace-nowrap">
                                3. Sıra
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="text-white font-bold text-sm sm:text-lg truncate max-w-[120px] sm:max-w-none">{winners[2].displayName}</div>
                            <div className="text-orange-400 text-xs">{winners[2].class}</div>
                        </div>
                    </div>
                    
                    <div className="w-full bg-gradient-to-t from-orange-950 to-orange-800 rounded-t-2xl relative flex flex-col items-center justify-start pt-6 border-t-4 border-orange-500 shadow-[0_0_30px_rgba(234,88,12,0.2)] h-40 sm:h-52 transition-all hover:-translate-y-1">
                        <div className="text-4xl font-black text-orange-900 opacity-40 select-none">3</div>
                        <div className="mt-auto mb-6 bg-orange-900/50 px-4 py-2 rounded-lg border border-orange-700/50">
                            <span className="text-white font-mono font-bold">{winners[2].score.toLocaleString()}</span>
                            <span className="text-orange-300 text-xs ml-1">XP</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const LeaderboardRow = ({ user, index }: { user: UserProfile, index: number }) => (
    <div 
        key={user.uid} 
        className="group flex items-center gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all hover:scale-[1.01] hover:shadow-lg hover:border-indigo-500/30"
    >
        <div className="w-8 flex justify-center">
            <div className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full font-mono font-bold text-sm",
                index === 0 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/50" :
                index === 1 ? "bg-slate-400 text-black shadow-lg shadow-slate-400/50" :
                index === 2 ? "bg-orange-600 text-white shadow-lg shadow-orange-600/50" :
                "bg-white/5 text-slate-500 group-hover:text-white"
            )}>
                {index + 1}
            </div>
        </div>
        <UserAvatar user={user} className="h-10 w-10 text-sm shrink-0" />
        <div className="flex-grow min-w-0">
            <div className="font-bold text-slate-200 group-hover:text-white transition-colors truncate">{user.displayName}</div>
            <div className="text-xs text-slate-500">{user.class}</div>
        </div>
        <div className="text-right">
            <div className="font-mono font-bold text-indigo-300 group-hover:text-indigo-200 text-lg">
                {(user.score || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wide">Puan</div>
        </div>
    </div>
);


// --- TAB COMPONENTS ---

// 1. CURRENT LEADERBOARD
function CurrentLeaderboardTab() {
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'all-time'>('daily');
    const [search, setSearch] = useState("");
    const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null);
        getLiveLeaderboard(filter)
            .then(data => {
                setLeaderboard(data);
            })
            .catch(err => {
                console.error("Error fetching leaderboard:", err);
                setError("Sıralama verileri yüklenirken bir hata oluştu.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [filter]);

    const filteredUsers = useMemo(() => {
        let data = [...leaderboard];
        if (search) {
            data = data.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()));
        }
        return data;
    }, [search, leaderboard]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
            );
        }

        if (error) {
            return <div className="text-center py-10 text-red-400 bg-red-900/20 rounded-lg">{error}</div>;
        }

        if (filteredUsers.length === 0) {
            return <div className="text-center py-10 text-slate-400 bg-black/20 rounded-lg">Bu periyot için gösterilecek veri yok.</div>;
        }
        
        if (filter === 'all-time') {
            return (
                <div className="space-y-8">
                    <Podium winners={filteredUsers.slice(0, 3)} />
                    <div className="space-y-2 pt-8">
                        <h3 className="text-lg font-bold text-center text-slate-400 mb-4">Tam Sıralama</h3>
                        {filteredUsers.slice(3).map((user, index) => (
                           <LeaderboardRow user={user} index={index + 3} key={user.uid} />
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-2">
                {filteredUsers.map((user, index) => (
                   <LeaderboardRow user={user} index={index} key={user.uid} />
                ))}
            </div>
        );
    }


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* FILTERS */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-black/20 p-2 rounded-2xl border border-white/5">
                <div className="flex bg-white/5 p-1 rounded-xl">
                    {(['daily', 'weekly', 'all-time'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                filter === f 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {f === 'daily' ? 'Bugün' : f === 'weekly' ? 'Bu Hafta' : 'Tümü'}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Öğrenci ara..." 
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {renderContent()}
        </div>
    );
}

// 2. CLASS LEADERBOARD
function ClassLeaderboardTab() {
    const [view, setView] = useState<'grade' | 'branch'>('grade');
    const [leaderboard, setLeaderboard] = useState<ClassLeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const fetcher = view === 'grade' ? getGradeLeaderboard : getBranchLeaderboard;
        fetcher().then(data => {
            setLeaderboard(data);
            setIsLoading(false);
        });
    }, [view]);

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex justify-center mb-6">
                <div className="flex p-1 rounded-xl bg-black/30 border border-white/10">
                    <button onClick={() => setView('grade')} className={cn("px-4 py-2 rounded-lg text-sm font-semibold", view === 'grade' ? 'bg-indigo-600 text-white' : 'text-slate-400')}>Sınıf Düzeyi</button>
                    <button onClick={() => setView('branch')} className={cn("px-4 py-2 rounded-lg text-sm font-semibold", view === 'branch' ? 'bg-indigo-600 text-white' : 'text-slate-400')}>Şube Bazında</button>
                </div>
            </div>
             {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {leaderboard.map((cls, index) => (
                        <div key={cls.className} className="relative overflow-hidden bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-white/10 p-6 rounded-2xl group hover:border-indigo-500/50 transition-all">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users className="h-24 w-24 text-indigo-400" />
                            </div>
                            
                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white shadow-lg shadow-indigo-500/20">
                                    {index + 1}
                                </div>
                                <div className="bg-white/5 px-3 py-1 rounded-full text-xs text-slate-300 font-mono">
                                    {cls.studentCount} Öğrenci
                                </div>
                            </div>

                            <h3 className="text-3xl font-black text-white mb-1 relative z-10">{cls.className}</h3>
                            <p className="text-indigo-200/60 text-sm mb-4 relative z-10">Sınıf Toplam Puanı</p>
                            
                            <div className="flex items-end gap-2 relative z-10">
                                <div className="text-4xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-white">
                                    {cls.totalScore.toLocaleString()}
                                </div>
                                <div className="mb-1.5">
                                    <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
             )}
        </div>
    );
}

// 3. HALL OF FAME (Interactive History)
function HallOfFameTab() {
    const [history, setHistory] = useState<HallOfFamePeriod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [animating, setAnimating] = useState(false);
    const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    const fetchData = useCallback(() => {
        setIsLoading(true);
        getHallOfFameData().then(data => {
            let periods: HallOfFamePeriod[] = [];
            if(view === 'daily') periods = data.daily;
            if(view === 'weekly') periods = data.weekly;
            if(view === 'monthly') periods = data.monthly;
            
            setHistory(periods);
            setCurrentIndex(0);
            setIsLoading(false);
        });
    }, [view]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        )
    }
    
    const currentPeriod = history[currentIndex];
    const winners = currentPeriod?.winners || [];

    const handlePrev = () => {
        if (currentIndex < history.length - 1) {
            setAnimating(true);
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setAnimating(false);
            }, 300);
        }
    };

    const handleNext = () => {
        if (currentIndex > 0) {
            setAnimating(true);
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
                setAnimating(false);
            }, 300);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-6 min-h-[500px]">
            
            <div className="flex justify-center mb-6">
                <div className="flex p-1 rounded-xl bg-black/30 border border-white/10">
                    <button onClick={() => setView('daily')} className={cn("px-4 py-2 rounded-lg text-sm font-semibold", view === 'daily' ? 'bg-amber-600 text-white' : 'text-slate-400')}>Günlük</button>
                    <button onClick={() => setView('weekly')} className={cn("px-4 py-2 rounded-lg text-sm font-semibold", view === 'weekly' ? 'bg-amber-600 text-white' : 'text-slate-400')}>Haftalık</button>
                    <button onClick={() => setView('monthly')} className={cn("px-4 py-2 rounded-lg text-sm font-semibold", view === 'monthly' ? 'bg-amber-600 text-white' : 'text-slate-400')}>Aylık</button>
                </div>
            </div>

            {history.length === 0 ? (
                 <p className="text-center text-slate-400">Şeref Kürsüsü için henüz veri bulunmuyor.</p>
            ) : (
                <>
                    {/* NAVIGATION HEADER */}
                    <div className="flex items-center justify-between w-full max-w-lg mb-12 bg-black/40 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={handlePrev}
                            disabled={currentIndex === history.length - 1}
                            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>

                        <div className="text-center">
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2 justify-center">
                                <Calendar className="h-4 w-4 text-amber-500" />
                                {currentPeriod.periodName}
                            </h2>
                            <p className="text-xs text-amber-500/70 font-mono mt-1">
                                {currentIndex === 0 ? "GÜNCEL ŞAMPİYONLAR" : "ARŞİV KAYITLARI"}
                            </p>
                        </div>

                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={handleNext}
                            disabled={currentIndex === 0}
                            className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>

                    {/* PODIUM CONTAINER */}
                    <div className={cn(
                        "flex items-end justify-center gap-4 sm:gap-8 w-full max-w-4xl px-4 transition-all duration-300",
                        animating ? "opacity-0 scale-95 blur-sm" : "opacity-100 scale-100 blur-0"
                    )}>
                        <Podium winners={winners}/>
                    </div>
                </>
            )}

        </div>
    );
}


// --- MAIN PAGE ---

export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState("current");
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#2b1055]">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-[#2b1055] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-[#2b1055] to-black text-white font-sans selection:bg-purple-500/30">
            
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#1a0b2e]/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4">
                    <Link href="/" className="flex items-center justify-center gap-2">
                        <BookOpenCheck className="h-6 w-6 text-amber-400" />
                        <span className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">Değerler Oyunu</span>
                    </Link>
                    {!user && (
                        <Button asChild size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                            <Link href="/login"><LogIn className="mr-2 h-4 w-4"/> Giriş Yap</Link>
                        </Button>
                    )}
                </div>
            </header>

            <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-12">
                
                {/* PAGE TITLE */}
                <div className="text-center mb-10 space-y-2">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-300 drop-shadow-sm">
                        Şampiyonlar Arenası
                    </h1>
                    <p className="text-indigo-200/60 font-medium max-w-lg mx-auto">
                        En iyilerin sahneye çıktığı yer. Puanlarını topla, sıralamada yüksel ve adını efsanelere yazdır.
                    </p>
                </div>

                {/* TABS HEADER */}
                <div className="flex justify-center mb-8">
                    <div className="flex p-1 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10 gap-1">
                        <button
                            onClick={() => setActiveTab("current")}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                                activeTab === "current" 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <List className="h-4 w-4" />
                            <span className="hidden sm:inline">Güncel Sıralama</span>
                            <span className="sm:hidden">Güncel</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("classes")}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                                activeTab === "classes" 
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Sınıf Ligi</span>
                            <span className="sm:hidden">Sınıflar</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("hall-of-fame")}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all",
                                activeTab === "hall-of-fame" 
                                    ? "bg-amber-600 text-white shadow-lg shadow-amber-500/25" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Trophy className="h-4 w-4" />
                            <span className="hidden sm:inline">Şeref Kürsüsü</span>
                            <span className="sm:hidden">Efsaneler</span>
                        </button>
                    </div>
                </div>

                {/* TAB CONTENT */}
                <div className="max-w-5xl mx-auto">
                    {activeTab === "current" && <CurrentLeaderboardTab />}
                    {activeTab === "classes" && <ClassLeaderboardTab />}
                    {activeTab === "hall-of-fame" && <HallOfFameTab />}
                </div>

            </main>
        </div>
    );
}
