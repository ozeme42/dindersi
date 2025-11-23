
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserProfile, ScoreEvent, Announcement, SchoolClass } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Award, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trophy, DollarSign, Loader2, Megaphone, PlusCircle, Trash2, Info, AlertTriangle, CheckCircle2, Users, List, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { getHallOfFameData, type HallOfFamePeriod, getStudentScoreEvents, getLiveLeaderboard, getGradeLeaderboard, getBranchLeaderboard, type ClassLeaderboardEntry } from "./actions";
import { format, formatDistanceToNow, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AnnouncementsSection } from "@/components/announcements-section";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertDialogRadixTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


function StudentScoreHistoryDialog({ student, isOpen, onOpenChange }: { student: UserProfile | null, isOpen: boolean, onOpenChange: (isOpen: boolean) => void }) {
    const [history, setHistory] = useState<ScoreEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && student) {
            setIsLoading(true);
            getStudentScoreEvents(student.uid).then(events => {
                setHistory(events);
                setIsLoading(false);
            });
        }
    }, [isOpen, student]);

    if (!student) return null;
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                         <UserAvatar user={student} />
                        {student.displayName} - Puan Geçmişi
                    </DialogTitle>
                    <DialogDescription>
                        Öğrencinin kazandığı tüm puanların detaylı dökümü.
                    </DialogDescription>
                </DialogHeader>
                 <ScrollArea className="max-h-[60vh] mt-4">
                     {isLoading ? (
                        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div>
                     ) : history.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Etkinlik</TableHead>
                                    <TableHead>Puan</TableHead>
                                    <TableHead>Tarih</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map(event => (
                                    <TableRow key={event.id}>
                                        <TableCell>
                                            <p className="font-medium">{event.gameType}</p>
                                            <p className="text-xs text-muted-foreground">{event.context}</p>
                                        </TableCell>
                                        <TableCell className={cn("font-bold", event.points > 0 ? "text-green-600" : "text-red-600")}>
                                            {event.points > 0 ? `+${event.points}` : event.points}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(event.timestamp), 'dd.MM.yyyy HH:mm:ss', { locale: tr })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     ) : (
                        <p className="text-center text-muted-foreground py-8">Bu öğrenci için henüz puan hareketi kaydedilmemiş.</p>
                     )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function LeaderboardTable({ leaderboardData, isLoading, onRowClick, canClick, showAll, onShowAllToggle }: { 
    leaderboardData: UserProfile[], 
    isLoading: boolean,
    onRowClick: (student: UserProfile) => void,
    canClick: boolean,
    showAll: boolean,
    onShowAllToggle: () => void,
}) {
    const displayedData = showAll ? leaderboardData : leaderboardData.slice(0, 100);

     return (
         <>
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
              Array.from({ length: 10 }).map((_, index) => (
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
              displayedData.map((player, index) => (
                <TableRow key={player.uid} onClick={() => canClick && onRowClick(player)} className={cn(canClick && 'cursor-pointer hover:bg-muted/50')}>
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
            {!isLoading && displayedData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">Bu filtreler için gösterilecek öğrenci bulunmuyor.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
        {leaderboardData.length > 100 && (
            <div className="text-center mt-4">
                <Button variant="outline" onClick={onShowAllToggle}>
                    {showAll ? "Daha Az Göster" : "Tümünü Göster"}
                </Button>
            </div>
        )}
        </>
     );
}

function HallOfFameList({ periods, isLoading, title }: { title?: string, periods: HallOfFamePeriod[], isLoading: boolean}) {
    if (isLoading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-48"/>)}
        </div>
    }

    if (periods.length === 0 || periods.every(p => p.winners.length === 0)) {
        return <p className="text-center text-muted-foreground py-8">Henüz bu kategoride bir şampiyon yok.</p>
    }

    return (
        <div className="space-y-6">
            {title && <h3 className={cn("text-2xl font-bold font-headline text-center", "sm:block")}>{title}</h3>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {periods.map((period, index) => {
                    if (period.winners.length === 0) return null;
                    return (
                        <Card key={`${period.periodName}-${index}`} className="bg-card/50 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">{period.periodName}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {period.winners.map((winner, winnerIndex) => (
                                        <li key={winner.uid} className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {winnerIndex === 0 ? <Crown className="h-5 w-5 text-yellow-400"/> : <Award className="h-5 w-5 text-gray-400"/>}
                                                <UserAvatar user={winner} className="h-8 w-8"/>
                                                <span className="font-medium">{winner.displayName}</span>
                                            </div>
                                            <Badge variant="secondary">{winner.score?.toLocaleString()} Puan</Badge>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

function CurrentLeaderboardTab() {
    const { user } = useAuth();
    const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [showAll, setShowAll] = useState(false);
    
    // Filters
    const [classFilter, setClassFilter] = useState<string>("all");
    const [branchFilter, setBranchFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'custom'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
    const classFilters = useMemo(() => {
        const classNames = new Set(allClasses.map(c => c.name));
        return Array.from(classNames).sort();
    }, [allClasses]);

    const selectedClassData = useMemo(() => {
        return allClasses.find(c => c.name === classFilter);
    }, [classFilter, allClasses]);

    const period = useMemo(() => {
        const now = new Date();
        switch (timeFilter) {
            case 'daily':
                return { start: startOfDay(now), end: endOfDay(now) };
            case 'weekly':
                return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
            case 'monthly':
                return { start: startOfMonth(now), end: endOfMonth(now) };
            case 'custom':
                return { start: dateRange?.from, end: dateRange?.to };
            case 'all':
            default:
                return { start: undefined, end: undefined };
        }
    }, [timeFilter, dateRange]);


    // Fetch all student profiles and score events based on the date range
    useEffect(() => {
        const fetchLeaderboardData = async () => {
            setIsLoading(true);
            try {
                // Fetch all classes for filter dropdowns
                const classesSnapshot = await getDocs(collection(db, "classes"));
                const classesData = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolClass));
                setAllClasses(classesData);

                // Fetch all students initially, excluding pool students
                const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
                const studentsSnapshot = await getDocs(studentsQuery);
                const studentProfiles = studentsSnapshot.docs
                    .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
                    .filter(student => !student.class?.endsWith('(Havuz)'));
                
                // If period is 'all', we don't need to filter by score events, just use the student's score field.
                if (timeFilter === 'all') {
                     const studentsWithScore = studentProfiles.filter(s => (s.score || 0) > 0);
                     studentsWithScore.sort((a,b) => (b.score || 0) - (a.score || 0));
                     setAllStudents(studentsWithScore);
                     setIsLoading(false);
                     return;
                }

                // For other periods, fetch score events within the date range
                const { start, end } = period;
                if (!start) { // e.g. custom range not fully selected
                    setAllStudents([]);
                    setIsLoading(false);
                    return;
                }
                const firestoreStartDate = Timestamp.fromDate(start);
                const firestoreEndDate = end ? Timestamp.fromDate(end) : firestoreStartDate;

                const scoreEventsQuery = query(
                    collection(db, 'scoreEvents'),
                    where("timestamp", ">=", firestoreStartDate),
                    where("timestamp", "<=", firestoreEndDate)
                );
                
                const eventsSnapshot = await getDocs(scoreEventsQuery);
                const scoresByStudent = new Map<string, number>();

                eventsSnapshot.forEach(doc => {
                    const event = doc.data();
                    const currentScore = scoresByStudent.get(event.userId) || 0;
                    scoresByStudent.set(event.userId, currentScore + event.points);
                });

                const leaderboardProfiles = studentProfiles
                    .map(student => ({
                        ...student,
                        score: scoresByStudent.get(student.uid) || 0,
                    }))
                    .filter(student => student.score > 0) // Only show students with points in the period
                    .sort((a,b) => b.score - a.score);

                setAllStudents(leaderboardProfiles);

            } catch (error) {
                console.error("Failed to fetch leaderboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboardData();
    }, [timeFilter, dateRange, period]);


    // Filter the already-fetched and sorted list of students based on the class filter.
    const filteredLeaderboard = useMemo(() => {
        let filtered = allStudents;
        if (classFilter !== 'all') {
            filtered = filtered.filter(player => player.class?.startsWith(classFilter));
        }
        if (branchFilter !== 'all' && classFilter !== 'all') {
            filtered = filtered.filter(player => player.class === `${classFilter} - ${branchFilter}`);
        }
        return filtered;
    }, [allStudents, classFilter, branchFilter]);
  
    const getPeriodLabel = () => {
        if (timeFilter === 'all') return "Tüm Zamanlar";
        if (timeFilter === 'daily') return `Bugün (${format(new Date(), 'd MMMM', { locale: tr })})`;
        if (timeFilter === 'custom') {
            if (dateRange?.from) {
                return dateRange.to
                    ? `${format(dateRange.from, 'd MMM yyyy', { locale: tr })} - ${format(dateRange.to, 'd MMM yyyy', { locale: tr })}`
                    : format(dateRange.from, 'd MMM yyyy', { locale: tr });
            }
            return 'Tarih Aralığı Seçin';
        }
        const { start, end } = period;
        if(start && end) {
             if (timeFilter === 'weekly') return `Bu Hafta (${format(start, 'd MMM')} - ${format(end, 'd MMM')})`;
             if (timeFilter === 'monthly') return `Bu Ay (${format(start, 'MMMM yyyy', { locale: tr })})`;
        }
        return '';
    };

    const handleRowClick = (student: UserProfile) => {
        if (user?.role === 'teacher' || user?.role === 'superadmin') {
            setSelectedStudent(student);
            setIsHistoryDialogOpen(true);
        }
    }

  return (
    <>
         <div className="flex justify-center flex-wrap gap-3 mb-4">
            {(['all', 'daily', 'weekly', 'monthly'] as const).map(period => (
                    <Button key={period} variant={timeFilter === period ? 'default' : 'outline'} onClick={() => setTimeFilter(period)}>
                        {period === 'all' ? "Tüm Zamanlar" : period === 'daily' ? "Bugün" : period === 'weekly' ? "Bu Hafta" : "Bu Ay"}
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
                <PopoverContent className="w-auto p-0" align="center">
                    <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                </PopoverContent>
            </Popover>
        </div>
        <div className="flex flex-col items-center gap-4 mb-6">
             <div className="flex flex-wrap justify-center gap-2">
                 <Button
                    variant={classFilter === 'all' ? 'default' : 'outline'}
                    onClick={() => { setClassFilter('all'); setBranchFilter('all'); }}
                    size="sm"
                >
                    Tüm Sınıflar
                </Button>
                {classFilters.map(c => (
                    <Button
                        key={c}
                        variant={classFilter === c ? 'default' : 'outline'}
                        onClick={() => { setClassFilter(c); setBranchFilter('all'); }}
                        size="sm"
                    >
                        {c}. Sınıflar
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
                    {selectedClassData.branches?.map(b => (
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
        <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
                 <CardTitle>
                    {getPeriodLabel()} - {classFilter === 'all' ? 'Genel Sıralama' : branchFilter === 'all' ? `${classFilter}. Sınıflar` : `${classFilter}-${branchFilter}`}
                </CardTitle>
                <CardDescription>
                    {user?.role === 'teacher' || user?.role === 'superadmin' ? 'Bir öğrencinin puan geçmişini görmek için üzerine tıklayın.' : 'Genel puan sıralaması.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <LeaderboardTable 
                    leaderboardData={filteredLeaderboard} 
                    isLoading={isLoading} 
                    onRowClick={handleRowClick}
                    canClick={user?.role === 'teacher' || user?.role === 'superadmin'}
                    showAll={showAll}
                    onShowAllToggle={() => setShowAll(!showAll)}
                />
            </CardContent>
        </Card>
        <StudentScoreHistoryDialog
            student={selectedStudent}
            isOpen={isHistoryDialogOpen}
            onOpenChange={setIsHistoryDialogOpen}
        />
    </>
  )
}

function ClassLeaderboardTab() {
    const [leaderboard, setLeaderboard] = useState<ClassLeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [view, setView] = useState<'grade' | 'branch'>('grade');

    useEffect(() => {
        setIsLoading(true);
        const fetcher = view === 'grade' ? getGradeLeaderboard : getBranchLeaderboard;
        fetcher().then(data => {
            setLeaderboard(data);
        }).finally(() => {
            setIsLoading(false);
        });
    }, [view]);

    const title = view === 'grade' ? 'Sınıf Düzeyi Sıralaması' : 'Şube Bazında Sıralama';
    const description = view === 'grade'
        ? 'Aynı seviyedeki tüm şubelerin toplam puanlarına göre sıralaması.'
        : 'Tüm şubelerin toplam puanlarına göre sıralaması.';

    return (
        <Card className="bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader>
                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant={view === 'grade' ? 'default' : 'outline'} onClick={() => setView('grade')}>Sınıf Düzeyi</Button>
                        <Button variant={view === 'branch' ? 'default' : 'outline'} onClick={() => setView('branch')}>Şube Bazında</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Sıra</TableHead>
                            <TableHead>Sınıf/Şube</TableHead>
                            <TableHead>Öğrenci Sayısı</TableHead>
                            <TableHead className="text-right">Toplam Puan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={index}>
                                <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            leaderboard.map((classData, index) => (
                                <TableRow key={classData.className}>
                                    <TableCell className="font-medium">
                                        <Badge variant={index < 3 ? "default" : "secondary"} className="text-lg flex items-center justify-center gap-1">
                                        {index === 0 && <Crown className="h-5 w-5 text-yellow-400" />}
                                        {index === 1 && <Award className="h-5 w-5 text-gray-400" />}
                                        {index === 2 && <Award className="h-5 w-5 text-orange-400" />}
                                        {index + 1}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-semibold text-base">{classData.className}</TableCell>
                                    <TableCell>{classData.studentCount}</TableCell>
                                    <TableCell className="text-right font-bold text-lg text-primary">{classData.totalScore.toLocaleString()}</TableCell>
                                </TableRow>
                            ))
                        )}
                         {!isLoading && leaderboard.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">Sınıf verisi bulunamadı.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

function HallOfFameTab() {
    const [hallOfFameData, setHallOfFameData] = useState<{ daily: HallOfFamePeriod[], weekly: HallOfFamePeriod[], monthly: HallOfFamePeriod[] }>({ daily: [], weekly: [], monthly: [] });
    const [liveLeaderboard, setLiveLeaderboard] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLiveLeaderboard = useCallback(() => {
        getLiveLeaderboard().then(liveData => {
            setLiveLeaderboard(liveData);
        });
    }, []);

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            getHallOfFameData(),
            getLiveLeaderboard()
        ]).then(([fameData, liveData]) => {
            setHallOfFameData(fameData);
            setLiveLeaderboard(liveData);
        }).finally(() => {
            setIsLoading(false);
        });
        
        const intervalId = setInterval(fetchLiveLeaderboard, 60000); // 60 saniyede bir
        return () => clearInterval(intervalId);

    }, [fetchLiveLeaderboard]);

    const todayLeaderboard: HallOfFamePeriod = {
        periodName: `Bugün (${format(new Date(), 'dd MMMM yyyy', { locale: tr })})`,
        winners: liveLeaderboard.slice(0, 3)
    };
    
    return (
        <Tabs defaultValue="daily">
            <div className="mb-6">
                 <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="daily">Günlük</TabsTrigger>
                    <TabsTrigger value="weekly">Haftalık</TabsTrigger>
                    <TabsTrigger value="monthly">Aylık</TabsTrigger>
                </TabsList>
            </div>
             <TabsContent value="daily" className="space-y-8">
                <HallOfFameList title="Bugünün Sıralaması (Canlı)" periods={[todayLeaderboard]} isLoading={isLoading}/>
                <HallOfFameList title="Günün Şampiyonları" periods={hallOfFameData.daily} isLoading={isLoading}/>
            </TabsContent>
            <TabsContent value="weekly">
                 <HallOfFameList title="Haftanın Şampiyonları" periods={hallOfFameData.weekly} isLoading={isLoading}/>
            </TabsContent>
            <TabsContent value="monthly">
                 <HallOfFameList title="Ayın Şampiyonları" periods={hallOfFameData.monthly} isLoading={isLoading}/>
            </TabsContent>
        </Tabs>
    )
}

export default function LeaderboardPage() {
    const [activeTab, setActiveTab] = useState("current");
  return (
    <div className="flex flex-col min-h-screen bg-grid">
      <AppHeader />
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 space-y-8">
        <div className="text-center animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl font-bold font-headline text-primary drop-shadow-lg">Liderlik Tablosu</h1>
        </div>

        <AnnouncementsSection category="general"/>
        
        <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-20 bg-card/50 backdrop-blur-sm p-2 rounded-xl">
              <TabsTrigger value="current" className="h-full text-base rounded-lg flex-col gap-1">
                  <List className="h-6 w-6"/>
                  <span className="hidden sm:inline">Güncel Sıralama</span>
                  <span className="sm:hidden">Güncel</span>
              </TabsTrigger>
              <TabsTrigger value="classes" className="h-full text-base rounded-lg flex-col gap-1">
                  <Users className="h-6 w-6"/>
                  <span className="hidden sm:inline">Sınıf Sıralaması</span>
                  <span className="sm:hidden">Sınıflar</span>
              </TabsTrigger>
              <TabsTrigger value="hall-of-fame" className="h-full text-base rounded-lg flex-col gap-1">
                  <Trophy className="h-6 w-6"/> Şeref Kürsüsü
              </TabsTrigger>
          </TabsList>
            <TabsContent value="current" className="mt-6">
                <CurrentLeaderboardTab />
            </TabsContent>
             <TabsContent value="classes" className="mt-6">
                <ClassLeaderboardTab />
            </TabsContent>
            <TabsContent value="hall-of-fame" className="mt-6">
                <HallOfFameTab />
            </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
