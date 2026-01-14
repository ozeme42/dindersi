
'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
    Crown, Trophy, Users, List, Flame, Search, 
    Calendar, ChevronLeft, ChevronRight, Loader2, BookOpenCheck, LogIn, School, GraduationCap, LayoutDashboard, Building2, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import Link from 'next/link';
import { getHallOfFameData, getLiveLeaderboard, HallOfFamePeriod } from './actions';
import type { UserProfile } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ITEMS_PER_PAGE = 20;

// --- YARDIMCI BİLEŞENLER ---

const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange 
}: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
}) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-4 mt-8">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-slate-900/50 border-white/10 text-white hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-all disabled:opacity-50"
            >
                <ChevronLeft className="h-4 w-4 mr-1" /> Önceki
            </Button>
            
            <div className="flex items-center gap-2 text-sm font-bold text-slate-400 bg-black/20 px-4 py-1.5 rounded-full border border-white/5">
                <span className="text-white">{currentPage}</span>
                <span className="text-slate-600">/</span>
                <span>{totalPages}</span>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-slate-900/50 border-white/10 text-white hover:bg-indigo-600 hover:border-indigo-500 hover:text-white transition-all disabled:opacity-50"
            >
                Sonraki <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
        </div>
    );
};

const RankBadge = ({ rank }: { rank: number }) => {
    if (rank === 1) return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-lg shadow-yellow-500/40 text-yellow-950 font-black text-sm shrink-0"><Crown className="h-5 w-5" /></div>;
    if (rank === 2) return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 shadow-lg shadow-slate-500/40 text-slate-900 font-black text-sm shrink-0">2</div>;
    if (rank === 3) return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-orange-600 shadow-lg shadow-orange-500/40 text-orange-950 font-black text-sm shrink-0">3</div>;
    return <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-slate-400 font-bold text-sm border border-white/10 shrink-0">{rank}</div>;
};

const Podium = ({ winners }: { winners: UserProfile[] }) => {
    if (!winners || winners.length === 0) {
        return <div className="text-center py-10 text-slate-400 bg-black/20 rounded-lg border border-white/5">Bu periyot için veri yok.</div>;
    }

    return (
        <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-4xl px-4 mt-8 mb-12">
            {/* 2. SIRA */}
            {winners.length > 1 && (
                <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-100">
                    <div className="mb-3 text-center relative group">
                        <UserAvatar user={winners[1]} className="w-16 h-16 sm:w-20 sm:h-20 text-xl border-4 border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)] mx-auto" />
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            2. Sıra
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <div className="text-white font-bold text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">{winners[1].displayName}</div>
                        <div className="text-slate-400 text-xs">{winners[1].class}</div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-slate-900/80 to-slate-800/80 rounded-t-xl mt-3 h-32 sm:h-44 flex items-end justify-center pb-4 border-t-4 border-slate-400 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-slate-400/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-slate-300 font-mono font-bold">{winners[1].score.toLocaleString()} XP</span>
                    </div>
                </div>
            )}

            {/* 1. SIRA */}
            {winners.length > 0 && (
                <div className="flex flex-col items-center w-1/3 z-10 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="mb-3 text-center relative group">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                            <Crown className="h-8 w-8 text-yellow-400 fill-yellow-400 animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                        </div>
                        <UserAvatar user={winners[0]} className="w-20 h-20 sm:w-28 sm:h-28 text-3xl border-4 border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.4)] mx-auto" />
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-950 text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                            Şampiyon
                        </div>
                    </div>
                    <div className="mt-5 text-center">
                        <div className="text-yellow-100 font-bold text-base sm:text-xl truncate max-w-[120px] sm:max-w-none">{winners[0].displayName}</div>
                        <div className="text-yellow-500/80 text-xs">{winners[0].class}</div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-yellow-900/40 to-amber-700/40 rounded-t-xl mt-3 h-40 sm:h-56 flex items-end justify-center pb-6 border-t-4 border-yellow-400 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-center">
                            <span className="text-yellow-100 font-mono font-black text-xl">{winners[0].score.toLocaleString()}</span>
                            <div className="text-[10px] text-yellow-400 font-bold tracking-widest">PUAN</div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. SIRA */}
            {winners.length > 2 && (
                <div className="flex flex-col items-center w-1/3 animate-in slide-in-from-bottom-8 duration-700 delay-200">
                    <div className="mb-3 text-center relative group">
                        <UserAvatar user={winners[2]} className="w-16 h-16 sm:w-20 sm:h-20 text-xl border-4 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] mx-auto" />
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-500 text-orange-100 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            3. Sıra
                        </div>
                    </div>
                    <div className="mt-4 text-center">
                        <div className="text-white font-bold text-sm sm:text-base truncate max-w-[100px] sm:max-w-none">{winners[2].displayName}</div>
                        <div className="text-orange-400 text-xs">{winners[2].class}</div>
                    </div>
                    <div className="w-full bg-gradient-to-t from-orange-950/80 to-orange-900/80 rounded-t-xl mt-3 h-28 sm:h-36 flex items-end justify-center pb-4 border-t-4 border-orange-500 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-orange-200 font-mono font-bold">{winners[2].score.toLocaleString()} XP</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const LeaderboardRow = ({ user, index }: { user: UserProfile, index: number }) => (
    <div 
        className="group relative flex items-center gap-4 p-4 bg-slate-900/40 hover:bg-slate-800/60 rounded-2xl border border-white/5 transition-all hover:scale-[1.01] hover:shadow-lg hover:border-indigo-500/30 overflow-hidden"
    >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        <RankBadge rank={index + 1} />
        <UserAvatar user={user} className="h-10 w-10 text-sm shrink-0 border border-white/10" />
        <div className="flex-grow min-w-0">
            <div className="font-bold text-slate-200 group-hover:text-white transition-colors truncate text-base">{user.displayName}</div>
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 border-white/10 text-slate-400 bg-black/20">
                    {user.class || 'Sınıfsız'}
                </Badge>
                {user.schoolName && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[150px] hidden sm:block">
                        {user.schoolName}
                    </span>
                )}
            </div>
        </div>
        <div className="text-right shrink-0">
            <div className="font-mono font-bold text-indigo-300 group-hover:text-indigo-200 text-lg">
                {(user.score || 0).toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">TOPLAM PUAN</div>
        </div>
    </div>
);

const GroupLeaderboardRow = ({ item, index, onClick, type }: { item: any, index: number, onClick: () => void, type: 'school' | 'grade' | 'branch' }) => {
    return (
        <div 
            onClick={onClick}
            className="group relative flex items-center gap-4 p-4 bg-slate-900/60 hover:bg-indigo-900/20 rounded-2xl border border-white/10 transition-all hover:scale-[1.01] hover:shadow-lg hover:border-indigo-500/50 cursor-pointer overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <RankBadge rank={index + 1} />
            
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shrink-0 shadow-inner group-hover:from-indigo-900 group-hover:to-slate-900 transition-colors">
                {type === 'school' && <School className="h-6 w-6 text-purple-400 group-hover:text-purple-300" />}
                {type === 'grade' && <GraduationCap className="h-6 w-6 text-blue-400 group-hover:text-blue-300" />}
                {type === 'branch' && <LayoutDashboard className="h-6 w-6 text-emerald-400 group-hover:text-emerald-300" />}
            </div>
            
            <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2">
                    <div className="font-bold text-white text-lg truncate">{item.name}</div>
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 h-5 bg-white/5 text-slate-400 border-white/5 group-hover:bg-indigo-500/20 group-hover:text-indigo-200">
                        {item.studentCount} Öğrenci
                    </Badge>
                </div>
            </div>
            
            <div className="text-right shrink-0">
                <div className="font-mono font-bold text-white text-xl group-hover:text-indigo-300 transition-colors">
                    {item.score.toLocaleString()}
                </div>
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    <Flame className="h-3 w-3 text-orange-500" /> Toplam Puan
                </div>
            </div>
        </div>
    );
}

// --- TAB BİLEŞENLERİ ---

// 1. GÜNCEL SIRALAMA (VARSAYILAN: TÜM ZAMANLAR)
function CurrentLeaderboardTab() {
    const [filter, setFilter] = useState<'monthly' | 'all-time'>('all-time');
    const [search, setSearch] = useState("");
    const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // PAGINATION STATE
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setIsLoading(true);
        getLiveLeaderboard(filter)
            .then(data => setLeaderboard(data))
            .catch(err => console.error(err))
            .finally(() => setIsLoading(false));
    }, [filter]);

    // Arama veya Filtre değişirse sayfayı 1 yap
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filter]);

    const filteredUsers = useMemo(() => {
        if (!search) return leaderboard;
        return leaderboard.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()));
    }, [search, leaderboard]);

    // Sayfalama Hesabı
    // Not: Arama yoksa ilk 3 kişi podyumda gösterilir, liste 4. kişiden başlar.
    // Arama varsa podyum gizlenir, liste 1. kişiden başlar.
    const listData = useMemo(() => {
        return search ? filteredUsers : filteredUsers.slice(3);
    }, [filteredUsers, search]);

    const totalPages = Math.ceil(listData.length / ITEMS_PER_PAGE);
    const paginatedList = listData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/50 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
                <div className="flex bg-black/20 p-1 rounded-xl w-full sm:w-auto">
                    <button onClick={() => setFilter('monthly')} className={cn("flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all", filter === 'monthly' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-400 hover:text-white hover:bg-white/5")}>Bu Ay</button>
                    <button onClick={() => setFilter('all-time')} className={cn("flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all", filter === 'all-time' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "text-slate-400 hover:text-white hover:bg-white/5")}>Tüm Zamanlar</button>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input type="text" placeholder="Öğrenci ara..." className="w-full bg-black/20 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-all placeholder:text-slate-600" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-indigo-400" /></div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">Bu filtre için kayıt bulunamadı.</div>
            ) : (
                <>
                    {!search && currentPage === 1 && <Podium winners={filteredUsers.slice(0, 3)} />}
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest px-2 mb-2"><List className="h-3 w-3" /> Sıralama Listesi</div>
                        
                        {paginatedList.map((user, index) => {
                            // Gerçek sıralama indeksi hesaplama
                            // Eğer arama varsa: (page-1)*20 + index
                            // Arama yoksa (ilk 3 podyumda): (page-1)*20 + index + 3
                            const realIndex = (currentPage - 1) * ITEMS_PER_PAGE + index + (search ? 0 : 3);
                            return <LeaderboardRow user={user} index={realIndex} key={user.uid} />
                        })}
                    </div>

                    <PaginationControls 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        onPageChange={setCurrentPage} 
                    />
                </>
            )}
        </div>
    );
}

// 2. SINIF & OKUL LİGLERİ
function ClassLeaderboardTab() {
    const [navStack, setNavStack] = useState<{ id: string, name: string, type: string }[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'groups' | 'students'>('groups');
    
    // PAGINATION STATE
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setIsLoading(true);
        getLiveLeaderboard('all-time').then(data => {
            setAllUsers(data);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        setViewMode('groups');
        setCurrentPage(1); // Reset page on navigation
    }, [navStack.length]);

    // View mode değişince de sayfa 1'e dönsün
    useEffect(() => {
        setCurrentPage(1);
    }, [viewMode]);

    const { groups, students } = useMemo(() => {
        if (isLoading) return { groups: [], students: [] };

        let filteredUsers = [...allUsers];
        let groupType: 'school' | 'grade' | 'branch' | null = null;

        if (navStack.length > 0) {
            const selectedSchool = navStack[0].name;
            filteredUsers = filteredUsers.filter(u => (u.schoolName || "Diğer Okullar") === selectedSchool);
        }
        if (navStack.length > 1) {
            const selectedGrade = navStack[1].name;
            filteredUsers = filteredUsers.filter(u => {
                const classStr = u.class || "Bilinmeyen";
                const grade = classStr.includes('-') ? classStr.split('-')[0].trim() + ". Sınıf" : classStr;
                return grade === selectedGrade;
            });
        }
        if (navStack.length > 2) {
            const selectedBranch = navStack[2].name;
            filteredUsers = filteredUsers.filter(u => (u.class || "Bilinmeyen") === selectedBranch);
        }

        let groupingData: any[] = [];
        
        if (navStack.length === 0) {
            groupType = 'school';
            const map = new Map();
            filteredUsers.forEach(u => {
                const key = u.schoolName || "Diğer Okullar";
                if(!map.has(key)) map.set(key, { name: key, score: 0, count: 0 });
                map.get(key).score += (u.score || 0);
                map.get(key).count += 1;
            });
            groupingData = Array.from(map.values()).sort((a,b) => b.score - a.score);
        } 
        else if (navStack.length === 1) {
            groupType = 'grade';
            const map = new Map();
            filteredUsers.forEach(u => {
                const classStr = u.class || "Bilinmeyen";
                const key = classStr.includes('-') ? classStr.split('-')[0].trim() + ". Sınıf" : classStr;
                if(!map.has(key)) map.set(key, { name: key, score: 0, count: 0 });
                map.get(key).score += (u.score || 0);
                map.get(key).count += 1;
            });
            groupingData = Array.from(map.values()).sort((a,b) => b.score - a.score);
        }
        else if (navStack.length === 2) {
            groupType = 'branch';
            const map = new Map();
            filteredUsers.forEach(u => {
                const key = u.class || "Bilinmeyen";
                if(!map.has(key)) map.set(key, { name: key, score: 0, count: 0 });
                map.get(key).score += (u.score || 0);
                map.get(key).count += 1;
            });
            groupingData = Array.from(map.values()).sort((a,b) => b.score - a.score);
        }

        const sortedStudents = filteredUsers.sort((a, b) => (b.score || 0) - (a.score || 0));

        return { 
            groups: groupingData.map(g => ({ ...g, type: groupType, id: g.name, studentCount: g.count })), 
            students: sortedStudents 
        };

    }, [allUsers, navStack, isLoading]);

    const handleDrillDown = (item: any) => {
        if (navStack.length < 3) {
            setNavStack([...navStack, { id: item.id, name: item.name, type: item.type }]);
        }
    };

    const handleBack = () => {
        setNavStack(prev => prev.slice(0, -1));
    };

    const currentTitle = navStack.length === 0 ? "Tüm Okullar" 
        : navStack.length === 1 ? navStack[0].name
        : navStack.length === 2 ? navStack[1].name
        : navStack[2].name;

    // Determine what to render based on viewMode and Drill-down level
    const dataToRender = (navStack.length === 3 || viewMode === 'students') ? students : groups;
    const totalPages = Math.ceil(dataToRender.length / ITEMS_PER_PAGE);
    const paginatedData = dataToRender.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-6">
            
            <div className="flex flex-col gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md sticky top-20 z-20 shadow-xl">
                <div className="flex items-center gap-4">
                    {navStack.length > 0 && (
                        <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 rounded-xl hover:bg-white/10 text-white shrink-0">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                    )}
                    <div className="overflow-hidden">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 truncate">
                            {navStack.length === 0 && <School className="h-5 w-5 text-purple-400" />}
                            {navStack.length === 1 && <School className="h-5 w-5 text-blue-400" />}
                            {navStack.length === 2 && <GraduationCap className="h-5 w-5 text-emerald-400" />}
                            {navStack.length === 3 && <LayoutDashboard className="h-5 w-5 text-orange-400" />}
                            {currentTitle}
                        </h3>
                        <div className="flex gap-2 text-xs text-slate-400 mt-1 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none">
                            <span className={cn("cursor-pointer hover:text-white transition-colors", navStack.length === 0 && "text-purple-300 font-bold")} onClick={() => setNavStack([])}>Okullar</span>
                            {navStack.map((item, idx) => (
                                <span key={idx} className="flex gap-2">
                                    <span className="text-slate-600">/</span>
                                    <span 
                                        className={cn("cursor-pointer hover:text-white transition-colors", idx === navStack.length - 1 && "text-purple-300 font-bold")}
                                        onClick={() => setNavStack(navStack.slice(0, idx + 1))}
                                    >
                                        {item.name}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {navStack.length > 0 && navStack.length < 3 && (
                    <div className="flex bg-black/20 p-1 rounded-xl w-full sm:w-fit self-center sm:self-start">
                        <button
                            onClick={() => setViewMode('groups')}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                                viewMode === 'groups' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                            )}
                        >
                            {navStack.length === 1 ? <GraduationCap className="h-4 w-4"/> : <LayoutDashboard className="h-4 w-4"/>}
                            {navStack.length === 1 ? 'Sınıflar' : 'Şubeler'}
                        </button>
                        <button
                            onClick={() => setViewMode('students')}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                                viewMode === 'students' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-white"
                            )}
                        >
                            <Users className="h-4 w-4"/>
                            Öğrenci Sıralaması
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-purple-400" /></div>
            ) : (
                <div className="space-y-3">
                    {/* ÖĞRENCİ LİSTESİ GÖRÜNÜMÜ */}
                    { (navStack.length === 3 || viewMode === 'students') ? (
                        paginatedData.length > 0 ? (
                            paginatedData.map((user: any, index) => {
                                const realIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                                return <LeaderboardRow user={user} index={realIndex} key={user.uid} />
                            })
                        ) : (
                            <div className="text-center py-12 text-slate-500 border border-dashed border-white/10 rounded-xl">
                                Bu kategoride öğrenci bulunamadı.
                            </div>
                        )
                    ) : (
                        /* GRUP LİSTESİ (OKUL/SINIF/ŞUBE) */
                        paginatedData.length > 0 ? (
                            paginatedData.map((item: any, index) => {
                                const realIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
                                return (
                                    <GroupLeaderboardRow 
                                        key={item.id} 
                                        item={item} 
                                        index={realIndex} 
                                        onClick={() => handleDrillDown(item)} 
                                        type={item.type} 
                                    />
                                )
                            })
                        ) : (
                            <div className="text-center py-12 text-slate-500 border border-dashed border-white/10 rounded-xl">
                                Alt kategori bulunamadı.
                            </div>
                        )
                    )}

                    <PaginationControls 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        onPageChange={setCurrentPage} 
                    />
                </div>
            )}
        </div>
    );
}

// 3. ŞEREF KÜRSÜSÜ
function HallOfFameTab() {
    const [history, setHistory] = useState<{ seasons: HallOfFamePeriod[], daily: HallOfFamePeriod[], weekly: HallOfFamePeriod[], monthly: HallOfFamePeriod[] }>({ seasons: [], daily: [], weekly: [], monthly: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentPeriodType, setCurrentPeriodType] = useState<'seasons' | 'monthly' | 'weekly' | 'daily'>('seasons');
    const [animating, setAnimating] = useState(false);
    
    // PAGINATION STATE FOR ARCHIVE LIST
    const [currentPage, setCurrentPage] = useState(1);

    const fetchData = useCallback(() => {
        setIsLoading(true);
        getHallOfFameData().then(data => {
            setHistory(data);
            if (data.seasons && data.seasons.length > 0) {
                 setCurrentPeriodType('seasons');
            } else if (data.monthly && data.monthly.length > 0) {
                setCurrentPeriodType('monthly');
            } else if (data.weekly && data.weekly.length > 0) {
                setCurrentPeriodType('weekly');
            } else {
                 setCurrentPeriodType('daily');
            }
            setCurrentIndex(0);
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const activeHistory = history[currentPeriodType] || [];

    const handlePrev = () => {
        if (currentIndex < activeHistory.length - 1) {
            setAnimating(true);
            setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
                setCurrentPage(1); // Reset page on period change
                setAnimating(false);
            }, 300);
        }
    };

    const handleNext = () => {
        if (currentIndex > 0) {
            setAnimating(true);
            setTimeout(() => {
                setCurrentIndex(prev => prev - 1);
                setCurrentPage(1); // Reset page on period change
                setAnimating(false);
            }, 300);
        }
    };
    
    const changePeriodType = (type: 'seasons' | 'monthly' | 'weekly' | 'daily') => {
        if (type !== currentPeriodType) {
            setCurrentPeriodType(type);
            setCurrentIndex(0);
        }
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-amber-400" /></div>;
    }

    const currentPeriod = activeHistory[currentIndex];
    const winners = currentPeriod?.winners || [];
    
    // Pagination for Hall of Fame
    const listData = winners.slice(3); // Top 3 are in podium
    const totalPages = Math.ceil(listData.length / ITEMS_PER_PAGE);
    const paginatedList = listData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    const getPeriodTitle = () => {
        switch(currentPeriodType) {
            case 'seasons': return 'Sezon Şampiyonları';
            case 'monthly': return 'Aylık Şeref Kürsüsü';
            case 'weekly': return 'Haftalık Şeref Kürsüsü';
            case 'daily': return 'Günlük Şeref Kürsüsü';
            default: return 'Şeref Kürsüsü';
        }
    }

    return (
        <div className="flex flex-col items-center py-6 min-h-[600px] animate-in fade-in zoom-in-95 duration-500">
            <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center p-2 bg-amber-500/10 rounded-full border border-amber-500/20">
                    <Trophy className="h-4 w-4 text-amber-400 mr-2" />
                    <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">{getPeriodTitle()}</span>
                </div>
                 <div className="flex bg-black/20 p-1 rounded-xl w-full sm:w-auto mt-4">
                    <button onClick={() => changePeriodType('seasons')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all", currentPeriodType === 'seasons' ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-white")} disabled={history.seasons.length === 0}>Sezon</button>
                    <button onClick={() => changePeriodType('monthly')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all", currentPeriodType === 'monthly' ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-white")} disabled={history.monthly.length === 0}>Aylık</button>
                    <button onClick={() => changePeriodType('weekly')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all", currentPeriodType === 'weekly' ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-white")} disabled={history.weekly.length === 0}>Haftalık</button>
                    <button onClick={() => changePeriodType('daily')} className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all", currentPeriodType === 'daily' ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-white")} disabled={history.daily.length === 0}>Günlük</button>
                </div>
            </div>

            {activeHistory.length === 0 ? (
                <div className="text-center py-20 px-10 border-2 border-dashed border-slate-800 rounded-3xl text-slate-500">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    Bu kategori için henüz arşiv kaydı bulunmuyor.
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between w-full max-w-lg mb-8 bg-gradient-to-r from-slate-900/80 to-slate-800/80 p-2 rounded-2xl border border-white/10 shadow-2xl">
                        <Button variant="ghost" size="icon" onClick={handlePrev} disabled={currentIndex === activeHistory.length - 1} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-12 w-12">
                            <ChevronLeft className="h-6 w-6" />
                        </Button>

                        <div className="text-center">
                            <div className="text-[10px] font-bold text-amber-500/80 tracking-[0.2em] uppercase mb-1">
                                {currentIndex === 0 ? "SON ŞAMPİYONLAR" : "GEÇMİŞ DÖNEM"}
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 justify-center">
                                <Calendar className="h-5 w-5 text-amber-500" />
                                {currentPeriod.periodName}
                            </h2>
                        </div>

                        <Button variant="ghost" size="icon" onClick={handleNext} disabled={currentIndex === 0} className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-12 w-12">
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>

                    <div className={cn("w-full transition-all duration-300", animating ? "opacity-0 translate-y-4 blur-md" : "opacity-100 translate-y-0 blur-0")}>
                        {currentPage === 1 && <Podium winners={winners}/>}
                        
                        {paginatedList.length > 0 && (
                            <div className="max-w-3xl mx-auto mt-8 space-y-3 px-4">
                                {currentPage === 1 && <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">- Diğer Kazananlar -</div>}
                                {paginatedList.map((user, idx) => {
                                    const realIndex = (currentPage - 1) * ITEMS_PER_PAGE + idx + 3;
                                    return <LeaderboardRow user={user} index={realIndex} key={user.uid} />
                                })}
                            </div>
                        )}

                        <PaginationControls 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPageChange={setCurrentPage} 
                        />
                    </div>
                </>
            )}
        </div>
    );
}


// --- ANA SAYFA ---

export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState("current");
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0f0720]">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col min-h-screen bg-[#0f0720] text-white font-sans selection:bg-indigo-500/30">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-amber-900/10 rounded-full blur-[100px]" />
            </div>

            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0f0720]/80 backdrop-blur-xl">
                <div className="container flex h-16 items-center justify-between px-4">
                    <Link href="/" className="flex items-center justify-center gap-2 group">
                        <div className="bg-indigo-600/20 p-1.5 rounded-lg group-hover:bg-indigo-600/30 transition-colors">
                            <BookOpenCheck className="h-5 w-5 text-indigo-400" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-white">Değerler Oyunu</span>
                    </Link>
                    {!user && (
                        <Button asChild size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
                            <Link href="/login"><LogIn className="mr-2 h-4 w-4"/> Giriş Yap</Link>
                        </Button>
                    )}
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 relative z-10 pb-24 md:pb-8">
                {/* HERO BÖLÜMÜ */}
                <div className="text-center mb-10 space-y-4">
                    <div className="inline-flex items-center justify-center p-2 bg-gradient-to-r from-amber-500/10 to-purple-500/10 rounded-full border border-white/5 mb-2">
                        <Trophy className="h-5 w-5 text-amber-400 mr-2" />
                        <span className="text-xs font-bold text-amber-200 uppercase tracking-widest">En İyiler Listesi</span>
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black uppercase tracking-tight text-white drop-shadow-2xl">
                        Şampiyonlar <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Arenası</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
                        Puanlarını topla, sıralamada yüksel ve adını efsaneler arasına yazdır.
                    </p>
                </div>

                {/* ANA SEKMELER */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-5xl mx-auto">
                    <div className="flex justify-center mb-10">
                        <TabsList className="bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 h-auto gap-2 shadow-2xl backdrop-blur-md">
                            <TabsTrigger 
                                value="current" 
                                className="px-6 py-3 rounded-xl text-sm font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-600/20 text-slate-400 hover:text-slate-200 transition-all"
                            >
                                <List className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Genel Sıralama</span>
                                <span className="sm:hidden">Sıralama</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="classes" 
                                className="px-6 py-3 rounded-xl text-sm font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-600/20 text-slate-400 hover:text-slate-200 transition-all"
                            >
                                <Users className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Okul & Sınıf Ligi</span>
                                <span className="sm:hidden">Ligler</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="hall-of-fame" 
                                className="px-6 py-3 rounded-xl text-sm font-bold data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-600/20 text-slate-400 hover:text-slate-200 transition-all"
                            >
                                <Trophy className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Şeref Kürsüsü</span>
                                <span className="sm:hidden">Kürsü</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="current" className="mt-0">
                        <CurrentLeaderboardTab />
                    </TabsContent>
                    <TabsContent value="classes" className="mt-0">
                        <ClassLeaderboardTab />
                    </TabsContent>
                    <TabsContent value="hall-of-fame" className="mt-0">
                        <HallOfFameTab />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

    