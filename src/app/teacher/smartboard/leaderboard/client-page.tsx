'use client';

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Award, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, Home, Trophy, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { getSmartboardLeaderboard, resetSmartboardScores } from "./actions";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import type { UserProfile, SchoolClass } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SmartboardLeaderboardClientPage() {
    const [leaderboardData, setLeaderboardData] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const [timeFilter, setTimeFilter] = useState<'all' | 'weekly' | 'monthly' | 'custom'>('all');
    const [dateOffset, setDateOffset] = useState(0);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [classFilter, setClassFilter] = useState<string>("all");
    const [branchFilter, setBranchFilter] = useState<string>("all");
    
    useEffect(() => {
        const fetchLeaderboard = async () => {
            setIsLoading(true);
            try {
                if (allClasses.length === 0) {
                    const classesSnapshot = await getDocs(collection(db, "classes"));
                    setAllClasses(classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass)));
                }
                const periodData = await getSmartboardLeaderboard({ 
                    period: timeFilter, 
                    offset: dateOffset,
                    startDate: dateRange?.from?.toISOString(),
                    endDate: dateRange?.to?.toISOString(),
                });
                setLeaderboardData(periodData);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
    }, [timeFilter, dateOffset, dateRange, allClasses.length]);

    const selectedClassData = useMemo(() => {
        return allClasses.find(c => c.id === classFilter);
    }, [classFilter, allClasses]);

    const filteredLeaderboard = useMemo(() => {
        let filtered = leaderboardData;
        if (classFilter !== 'all') {
            filtered = filtered.filter(player => player.class?.startsWith(selectedClassData?.name || ''));
        }
        if (branchFilter !== 'all' && classFilter !== 'all' && selectedClassData) {
            filtered = filtered.filter(player => player.class === `${selectedClassData.name} - ${branchFilter}`);
        }
        return filtered;
    }, [leaderboardData, classFilter, branchFilter, selectedClassData]);
    
    const getPeriodLabel = () => {
        if (timeFilter === 'all') return "Tüm Zamanlar";
        if (timeFilter === 'custom') {
            if (dateRange?.from) {
                return dateRange.to
                    ? `${format(dateRange.from, 'd MMM yyyy', { locale: tr })} - ${format(dateRange.to, 'd MMM yyyy', { locale: tr })}`
                    : format(dateRange.from, 'd MMM yyyy', { locale: tr });
            }
            return 'Tarih Aralığı Seçin';
        }
        const now = new Date();
        if (timeFilter === 'weekly') {
            const currentDay = now.getDay();
            const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() + dayOffset + (dateOffset * 7));
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            return `${format(weekStart, 'd MMM')} - ${format(weekEnd, 'd MMM yyyy', { locale: tr })}`;
        }
        if (timeFilter === 'monthly') {
            const month = new Date(now.getFullYear(), now.getMonth() + dateOffset, 1);
            return format(month, 'MMMM yyyy', { locale: tr });
        }
        return '';
    }
    
     const handleTimeFilterChange = (newFilter: 'all' | 'weekly' | 'monthly') => {
         setDateOffset(0);
         setDateRange(undefined);
         setTimeFilter(newFilter);
    }

    const handleResetScores = async () => {
        const result = await resetSmartboardScores();
        if(result.success) {
            toast({ title: "Başarılı!", description: "Turnuva puanları sıfırlandı."});
            setLeaderboardData([]);
        } else {
            toast({ title: "Hata!", description: result.error, variant: "destructive" });
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
             {/* Arka Plan */}
             <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-yellow-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-6">
                     <div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase drop-shadow-md flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                                <Trophy className="h-8 w-8 text-yellow-400" />
                            </div>
                            Turnuva Liderliği
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">Bu liderlik tablosu sadece Akıllı Tahta yarışmalarından kazanılan puanları gösterir.</p>
                     </div>
                     <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900">
                        <Link href="/teacher/smartboard">
                            <Home className="mr-2 h-4 w-4" /> Panele Dön
                        </Link>
                    </Button>
                </div>
                
                {/* Filters */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="bg-slate-950 p-1 rounded-lg border border-white/10 flex">
                            {(['all', 'weekly', 'monthly'] as const).map(period => (
                                <Button 
                                    key={period} 
                                    variant={timeFilter === period ? 'default' : 'ghost'} 
                                    onClick={() => handleTimeFilterChange(period)}
                                    size="sm"
                                    className={cn(
                                        "rounded-md transition-all font-bold",
                                        timeFilter === period ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {period === 'all' ? "Tüm Zamanlar" : period === 'weekly' ? "Haftalık" : "Aylık"}
                                </Button>
                            ))}
                        </div>
                        
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-medium border-white/10 bg-slate-950 text-slate-300 hover:bg-slate-900 hover:text-white",
                                        !dateRange && "text-muted-foreground",
                                        timeFilter === 'custom' && "border-indigo-500 ring-1 ring-indigo-500 bg-indigo-500/10 text-indigo-300"
                                    )}
                                    onClick={() => setTimeFilter('custom')}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "d MMM", {locale: tr})} - ${format(dateRange.to, "d MMM", {locale: tr})}` : format(dateRange.from, "d MMM", {locale: tr})) : (<span>Tarih Aralığı Seç</span>)}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-white" align="start">
                                <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex gap-2">
                        <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setBranchFilter('all'); }}>
                            <SelectTrigger className="w-[140px] bg-slate-950 border-white/10 text-white h-10"><SelectValue placeholder="Sınıf" /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white"><SelectItem value="all">Tüm Sınıflar</SelectItem>{allClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={branchFilter} onValueChange={setBranchFilter} disabled={classFilter === 'all'}>
                            <SelectTrigger className="w-[140px] bg-slate-950 border-white/10 text-white h-10"><SelectValue placeholder="Şube" /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                <SelectItem value="all">Tüm Şubeler</SelectItem>
                                {selectedClassData?.branches?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Period Title & Navigation */}
                {timeFilter !== 'all' && timeFilter !== 'custom' && (
                    <div className="flex justify-center items-center gap-6 py-2">
                        <Button variant="outline" size="icon" onClick={() => setDateOffset(d => d - 1)} className="border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:bg-white/10 rounded-full h-10 w-10">
                            <ChevronLeft className="h-5 w-5"/>
                        </Button>
                        <p className="text-2xl font-black text-white uppercase tracking-wide drop-shadow-lg">{getPeriodLabel()}</p>
                        <Button variant="outline" size="icon" onClick={() => setDateOffset(d => d + 1)} disabled={dateOffset === 0} className="border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:bg-white/10 rounded-full h-10 w-10 disabled:opacity-30">
                            <ChevronRight className="h-5 w-5"/>
                        </Button>
                    </div>
                )}

                {/* Leaderboard Table */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
                    <CardHeader className="flex-row justify-between items-center border-b border-white/5 pb-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-2"><Filter className="h-5 w-5 text-indigo-400"/> Genel Sıralama</CardTitle>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 font-bold px-4">
                                    <Trash2 className="mr-2 h-4 w-4" /> Puanları Sıfırla
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-400">Tüm Turnuva Puanlarını Sıfırlamak İstediğinize Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        Bu işlem geri alınamaz. Tüm öğrencilerin akıllı tahta yarışmalarından kazandığı puanlar kalıcı olarak silinecektir. Genel puanları etkilenmeyecektir.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleResetScores} className="bg-red-600 hover:bg-red-500 text-white border-none">Evet, Sıfırla</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-800/80">
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                        <TableHead className="w-[80px] text-center text-slate-300 font-bold text-base">Sıra</TableHead>
                                        <TableHead className="text-slate-300 font-bold text-base">Öğrenci</TableHead>
                                        <TableHead className="text-slate-300 font-bold text-base">Sınıf/Şube</TableHead>
                                        <TableHead className="text-right text-slate-300 font-bold text-base pr-8">Puan</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, index) => (
                                            <TableRow key={index} className="border-white/5">
                                                <TableCell><Skeleton className="h-8 w-8 rounded-full bg-slate-800 mx-auto" /></TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-10 w-10 rounded-full bg-slate-800" />
                                                        <Skeleton className="h-4 w-32 bg-slate-800" />
                                                    </div>
                                                </TableCell>
                                                <TableCell><Skeleton className="h-4 w-24 bg-slate-800" /></TableCell>
                                                <TableCell className="text-right"><Skeleton className="h-6 w-16 bg-slate-800 ml-auto" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        filteredLeaderboard.length > 0 ? (
                                            filteredLeaderboard.map((player, index) => (
                                                <TableRow key={player.uid} className="border-white/5 hover:bg-white/5 transition-colors group">
                                                    <TableCell className="font-medium text-center">
                                                        <div className="flex items-center justify-center">
                                                            {index === 0 && <Crown className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
                                                            {index === 1 && <Award className="h-6 w-6 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]" />}
                                                            {index === 2 && <Award className="h-6 w-6 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" />}
                                                            {index > 2 && <span className="text-lg font-bold text-slate-500 font-mono">#{index + 1}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("rounded-full p-0.5 border-2", index === 0 ? "border-yellow-400" : index === 1 ? "border-slate-300" : index === 2 ? "border-orange-400" : "border-slate-700")}>
                                                                 <UserAvatar user={player} className="h-10 w-10" />
                                                            </div>
                                                            <span className={cn("font-bold text-lg", index === 0 ? "text-yellow-400" : index === 1 ? "text-slate-200" : index === 2 ? "text-orange-300" : "text-slate-300")}>{player.displayName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-white/10">{player.class}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8">
                                                        <span className="font-black text-xl text-emerald-400 drop-shadow-sm">{(player.score || 0).toLocaleString()}</span>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-slate-500 italic">
                                                    Bu dönem için turnuva puanı kazanan öğrenci bulunmuyor.
                                                </TableCell>
                                            </TableRow>
                                        )
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}