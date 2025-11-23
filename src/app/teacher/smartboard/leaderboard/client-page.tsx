
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Award, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, Home } from "lucide-react";
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
    <div className="flex flex-col min-h-screen p-4 sm:p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-headline mb-6 text-center">Turnuva Liderliği</h1>
        <Button asChild variant="outline">
          <Link href="/teacher/smartboard">
            <Home className="mr-2 h-4 w-4" /> Panele Dön
          </Link>
        </Button>
      </div>
      <p className="text-center text-muted-foreground mb-8">Bu liderlik tablosu sadece Akıllı Tahta yarışmalarından kazanılan puanları gösterir.</p>
        
        <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex items-center gap-2 flex-wrap justify-center">
                <p className="text-sm font-medium mr-2">Zaman Filtresi:</p>
                {(['all', 'weekly', 'monthly'] as const).map(period => (
                    <Button key={period} variant={timeFilter === period ? 'default' : 'outline'} onClick={() => handleTimeFilterChange(period)}>
                        {period === 'all' ? "Tüm Zamanlar" : period === 'weekly' ? "Haftalık" : "Aylık"}
                    </Button>
                ))}
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground", timeFilter === 'custom' && "ring-2 ring-primary")}
                            onClick={() => setTimeFilter('custom')}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "d MMM, y", {locale: tr})} - ${format(dateRange.to, "d MMM, y", {locale: tr})}` : format(dateRange.from, "d MMM, y", {locale: tr})) : (<span>Tarih Aralığı Seç</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                    </PopoverContent>
                </Popover>
            </div>
             {timeFilter !== 'all' && timeFilter !== 'custom' && (
                <div className="flex justify-center items-center gap-4 mt-2">
                    <Button variant="outline" size="icon" onClick={() => setDateOffset(d => d - 1)}>
                        <ChevronLeft className="h-4 w-4"/>
                    </Button>
                    <p className="text-lg font-semibold w-56 text-center">{getPeriodLabel()}</p>
                    <Button variant="outline" size="icon" onClick={() => setDateOffset(d => d + 1)} disabled={dateOffset === 0}>
                        <ChevronRight className="h-4 w-4"/>
                    </Button>
                </div>
            )}
             <div className="flex flex-wrap justify-center gap-2">
                 <Button
                    variant={classFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => { setClassFilter('all'); setBranchFilter('all'); }}
                    size="sm"
                >
                    Tüm Sınıflar
                </Button>
                {allClasses.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                    <Button
                        key={c.id}
                        variant={classFilter === c.id ? 'default' : 'outline'}
                        onClick={() => { setClassFilter(c.id); setBranchFilter('all'); }}
                        size="sm"
                    >
                        {c.name}. Sınıflar
                    </Button>
                ))}
            </div>

            {selectedClassData && (
                <div className="flex flex-wrap justify-center gap-2">
                    <Button
                        variant={branchFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setBranchFilter('all')}
                        size="sm"
                    >
                        Tüm Şubeler
                    </Button>
                    {selectedClassData.branches?.sort().map(b => (
                        <Button
                            key={b}
                            variant={branchFilter === b ? 'default' : 'outline'}
                            onClick={() => setBranchFilter(b)}
                            size="sm"
                        >
                            {b} Şubesi
                        </Button>
                    ))}
                </div>
            )}
        </div>
        
        <Card>
          <CardHeader className="flex-row justify-between items-center">
            <div className="space-y-1">
                <CardTitle>{getPeriodLabel()} - Genel Sıralama</CardTitle>
                <CardDescription>Akıllı tahta yarışmalarından kazanılan puanlar.</CardDescription>
            </div>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" /> Puanları Sıfırla
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tüm Turnuva Puanlarını Sıfırlamak İstediğinize Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. Tüm öğrencilerin akıllı tahta yarışmalarından kazandığı puanlar kalıcı olarak silinecektir. Genel puanları etkilenmeyecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetScores}>Evet, Sıfırla</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Sıra</TableHead>
                  <TableHead>Öğrenci</TableHead>
                  <TableHead>Sınıf/Şube</TableHead>
                  <TableHead className="text-right">Puan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  filteredLeaderboard.map((player, index) => (
                    <TableRow key={player.uid}>
                      <TableCell className="font-medium">
                        <Badge variant={index < 3 ? "default" : "secondary"} className="text-lg flex items-center justify-center gap-1">
                          {index === 0 && <Crown className="h-5 w-5 text-yellow-400" />}
                          {index === 1 && <Award className="h-5 w-5 text-gray-400" />}
                          {index === 2 && <Award className="h-5 w-5 text-orange-400" />}
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={player} />
                          <span className="font-medium">{player.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{player.class}</TableCell>
                      <TableCell className="text-right font-semibold text-lg text-primary">
                        {(player.score || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && filteredLeaderboard.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">Bu dönem için turnuva puanı kazanan öğrenci bulunmuyor.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
