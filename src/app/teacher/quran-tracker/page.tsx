'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
    BookOpen,
    Scale,
    Users,
    Sparkles,
    Search,
    Printer,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Minus,
    Plus,
    Flame,
    GraduationCap,
    Award,
    Edit3,
    Check,
    Loader2,
    Play,
    LayoutGrid,
    Table2,
    Sun,
    Moon,
    ChevronRight,
    Trophy,
    Star,
    Layers,
    SlidersHorizontal,
    Volume2,
    VolumeX
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ELIFBA_STAGES, ElifbaStage } from '@/lib/elifba-curriculum';
import {
    getQuranTrackerData,
    saveStudentQuranProgress,
    batchUpdateQuranStage,
    type QuranStudentProgress
} from './actions';
import { LiveQuranTester } from './live-quran-tester';
import type { SchoolClass, UserProfile } from '@/lib/types';

export default function QuranTrackerPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    // Sınıf & Şube State
    const [allClasses, setAllClasses] = useState<SchoolClass[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [isLoadingClasses, setIsLoadingClasses] = useState<boolean>(true);

    // Öğrenci & İlerleme Verileri
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [progressMap, setProgressMap] = useState<{ [uid: string]: QuranStudentProgress }>({});
    const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
    const [className, setClassName] = useState<string>('');

    // Görünüm & Tema Modları (Elifba Tasarım DNA'sı)
    const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards'); // 'cards' (Pano/Kartlar) veya 'matrix' (Detaylı Tablo)
    const [ambianceTheme, setAmbianceTheme] = useState<'dark' | 'light'>('dark');

    // Filtre & Arama
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'quran' | 'harekes' | 'letters'>('all');

    // Canlı Test Modalı State
    const [isLiveTestOpen, setIsLiveTestOpen] = useState<boolean>(false);
    const [testingStudent, setTestingStudent] = useState<UserProfile | null>(null);
    const [testingStageId, setTestingStageId] = useState<string>('harfler');

    // Cüz Sayfası Hızlı Düzenleme
    const [editingCuzStudentUid, setEditingCuzStudentUid] = useState<string | null>(null);
    const [tempCuzPage, setTempCuzPage] = useState<string>('');

    // 1. Sınıfları Yükle
    useEffect(() => {
        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
                const cls = snap.docs.map(d => ({ id: d.id, ...d.data() }) as SchoolClass);
                setAllClasses(cls);

                // Varsayılan olarak ilk sınıfı ve şubeyi seç
                if (cls.length > 0) {
                    const firstClass = cls[0];
                    setSelectedClassId(firstClass.id);
                    if (firstClass.branches && firstClass.branches.length > 0) {
                        setSelectedBranch(firstClass.branches[0]);
                    } else {
                        setSelectedBranch('all');
                    }
                }
            } catch (err) {
                console.error("Sınıflar yüklenemedi:", err);
            } finally {
                setIsLoadingClasses(false);
            }
        };
        fetchClasses();
    }, []);

    // Seçili Sınıf Nesnesi
    const currentClass = useMemo(() => {
        return allClasses.find(c => c.id === selectedClassId) || null;
    }, [allClasses, selectedClassId]);

    // 2. Sınıf veya Şube Değiştiğinde Verileri Getir
    const loadTrackerData = useCallback(async () => {
        if (!selectedClassId || !selectedBranch) return;
        setIsLoadingData(true);

        const res = await getQuranTrackerData(selectedClassId, selectedBranch, user?.uid);
        if (res.success && res.students) {
            setStudents(res.students);
            setProgressMap(res.progress || {});
            setClassName(res.className || '');
        } else {
            toast({
                title: "Veri Hatası",
                description: res.error || "Öğrenci listesi alınamadı.",
                variant: "destructive"
            });
            setStudents([]);
            setProgressMap({});
        }
        setIsLoadingData(false);
    }, [selectedClassId, selectedBranch, user?.uid, toast]);

    useEffect(() => {
        loadTrackerData();
    }, [loadTrackerData]);

    // Özet İstatistikler
    const stats = useMemo(() => {
        const total = students.length;
        let quranCount = 0;
        let harekesCount = 0;
        let lettersCount = 0;

        students.forEach(s => {
            const prog = progressMap[s.uid];
            if (!prog) {
                lettersCount++;
                return;
            }

            // Eğer cuz aşaması tamamlandıysa veya cuzPage > 0 ise
            if (prog.cuzPage && prog.cuzPage > 0) {
                quranCount++;
            } else if (prog.stages['cuz']?.status === 'completed' || prog.stages['cuz']?.status === 'in_progress') {
                quranCount++;
            } else if (
                prog.stages['ustun1']?.status === 'completed' ||
                prog.stages['esre1']?.status === 'completed' ||
                prog.stages['otre1']?.status === 'completed' ||
                prog.stages['cezm']?.status === 'completed' ||
                prog.stages['sedde']?.status === 'completed'
            ) {
                harekesCount++;
            } else {
                lettersCount++;
            }
        });

        const quranPercent = total > 0 ? Math.round((quranCount / total) * 100) : 0;
        return { total, quranCount, harekesCount, lettersCount, quranPercent };
    }, [students, progressMap]);

    // Hızlı Aşama Durumu Değiştirme
    const handleSetStageStatus = async (
        student: UserProfile,
        stageId: string,
        newStatus: 'completed' | 'in_progress' | 'not_started'
    ) => {
        const res = await saveStudentQuranProgress({
            studentUid: student.uid,
            studentName: student.displayName || '',
            studentNumber: student.studentNumber,
            classId: selectedClassId,
            className,
            branch: selectedBranch,
            stageId,
            status: newStatus,
            score: newStatus === 'completed' ? 100 : undefined
        });

        if (res.success) {
            // Lokal state optimistik güncelleme
            setProgressMap(prev => {
                const current = prev[student.uid] || {
                    id: student.uid,
                    studentUid: student.uid,
                    studentName: student.displayName || '',
                    classId: selectedClassId,
                    className,
                    branch: selectedBranch,
                    currentStageId: stageId,
                    stages: {}
                };
                return {
                    ...prev,
                    [student.uid]: {
                        ...current,
                        stages: {
                            ...current.stages,
                            [stageId]: {
                                status: newStatus,
                                completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
                                score: newStatus === 'completed' ? 100 : undefined
                            }
                        }
                    }
                };
            });
            toast({ title: "Güncellendi", description: `${student.displayName} için aşama durumu güncellendi.` });
        } else {
            toast({ title: "Hata", description: res.error, variant: "destructive" });
        }
    };

    // Cüz Sayfasını Doğrudan Kaydet
    const handleSaveCuzPage = async (student: UserProfile, explicitPage?: number) => {
        const pageNum = explicitPage !== undefined ? explicitPage : parseInt(tempCuzPage, 10);
        if (isNaN(pageNum) || pageNum < 0) {
            setEditingCuzStudentUid(null);
            return;
        }

        const res = await saveStudentQuranProgress({
            studentUid: student.uid,
            studentName: student.displayName || '',
            studentNumber: student.studentNumber,
            classId: selectedClassId,
            className,
            branch: selectedBranch,
            stageId: 'cuz',
            status: pageNum > 0 ? 'completed' : 'not_started',
            cuzPage: pageNum
        });

        if (res.success) {
            setProgressMap(prev => ({
                ...prev,
                [student.uid]: {
                    ...(prev[student.uid] || {} as any),
                    cuzPage: pageNum
                }
            }));
            toast({ title: "Kaydedildi", description: `${student.displayName} Cüz Sayfa ${pageNum} olarak güncellendi.` });
        }
        setEditingCuzStudentUid(null);
    };

    // Sayfa Hızlı Artır / Azalt (+ / -)
    const handleQuickChangeCuzPage = async (student: UserProfile, delta: number) => {
        const prog = progressMap[student.uid];
        const currentPage = prog?.cuzPage || 1;
        const newPage = Math.max(1, Math.min(604, currentPage + delta));
        await handleSaveCuzPage(student, newPage);
    };

    // Canlı Test Modunu Başlat
    const handleStartLiveTest = (student: UserProfile, stageId: string = 'harfler') => {
        setTestingStudent(student);
        setTestingStageId(stageId);
        setIsLiveTestOpen(true);
    };

    // Filtrelenmiş Öğrenci Listesi
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesSearch = !searchTerm.trim() ||
                (s.displayName || '').toLocaleLowerCase('tr').includes(searchTerm.toLocaleLowerCase('tr')) ||
                (s.studentNumber || '').includes(searchTerm);

            if (!matchesSearch) return false;

            const prog = progressMap[s.uid];
            if (statusFilter === 'quran') {
                return (prog?.cuzPage && prog.cuzPage > 0) || prog?.stages['cuz']?.status === 'completed';
            }
            if (statusFilter === 'harekes') {
                return (
                    prog?.stages['ustun1']?.status === 'completed' ||
                    prog?.stages['esre1']?.status === 'completed' ||
                    prog?.stages['otre1']?.status === 'completed'
                ) && (!prog?.cuzPage || prog.cuzPage === 0);
            }
            if (statusFilter === 'letters') {
                return !prog || (!prog.stages['ustun1']?.status && (!prog.cuzPage || prog.cuzPage === 0));
            }
            return true;
        });
    }, [students, searchTerm, statusFilter, progressMap]);

    // Elifba Aşamaları (Kur'an Hariç)
    const elifbaStagesList = useMemo(() => {
        return ELIFBA_STAGES.filter(s => s.category !== 'quran');
    }, []);

    // Öğrencinin En Son Aktif Aşaması ve İlerleme Yüzdesi
    const getStudentStageInfo = useCallback((studentUid: string) => {
        const prog = progressMap[studentUid];
        if (!prog) {
            return {
                level: 'letters' as const,
                currentTitle: 'Harfler',
                completedCount: 0,
                percent: 0,
                badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            };
        }

        if (prog.cuzPage && prog.cuzPage > 0) {
            return {
                level: 'quran' as const,
                currentTitle: `Kur'an / Cüz (Sayfa ${prog.cuzPage})`,
                completedCount: elifbaStagesList.length,
                percent: 100,
                badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            };
        }

        let completedCount = 0;
        let activeStageTitle = 'Harfler';
        let level: 'letters' | 'harekes' | 'quran' = 'letters';

        for (const stage of elifbaStagesList) {
            const st = prog.stages[stage.id]?.status;
            if (st === 'completed') {
                completedCount++;
            } else if (st === 'in_progress') {
                activeStageTitle = stage.title;
            }
        }

        const percent = Math.round((completedCount / elifbaStagesList.length) * 100);

        if (completedCount >= 5) {
            level = 'harekes';
        }

        return {
            level,
            currentTitle: activeStageTitle,
            completedCount,
            percent,
            badgeColor: level === 'harekes'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
        };
    }, [progressMap, elifbaStagesList]);

    return (
        <div className={cn(
            "min-h-screen font-sans transition-colors duration-300 relative overflow-hidden",
            ambianceTheme === 'dark' ? "bg-[#090d16] text-slate-100" : "bg-slate-50 text-slate-900"
        )}>
            
            {/* SAF TABLO YAZDIRMA CSS */}
            <style media="print">{`
                @page { size: landscape; margin: 10mm; }
                body { background: white !important; color: black !important; }
                .print-hide { display: none !important; }
                .print-show { display: block !important; }
                table { width: 100% !important; border-collapse: collapse !important; border: 1px solid black !important; }
                th, td { border: 1px solid black !important; padding: 4px !important; color: black !important; font-size: 10pt !important; text-align: center !important; }
                th:first-child, td:first-child { text-align: left !important; }
            `}</style>

            {/* Arka Plan Canlı Radial Işık ve Izgara Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0 print-hide">
                <div className={cn(
                    "absolute top-[-15%] left-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] transition-all",
                    ambianceTheme === 'dark' ? "bg-emerald-900/15" : "bg-emerald-200/40"
                )} />
                <div className={cn(
                    "absolute bottom-[-15%] right-[-10%] w-[900px] h-[900px] rounded-full blur-[150px] transition-all",
                    ambianceTheme === 'dark' ? "bg-cyan-900/15" : "bg-cyan-200/40"
                )} />
                <div className={cn(
                    "absolute top-[40%] left-[30%] w-[600px] h-[600px] rounded-full blur-[140px] transition-all",
                    ambianceTheme === 'dark' ? "bg-indigo-900/10" : "bg-indigo-200/30"
                )} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] bg-[size:32px_32px] opacity-40 pointer-events-none" />
            </div>

            <div className="max-w-[1700px] mx-auto p-3 sm:p-6 md:p-8 relative z-10 space-y-6">

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 1. ÜST GEZİNME, BAŞLIK VE KONTROLLER (CANLI & FİZİKSEL) */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className={cn(
                    "p-4 sm:p-5 rounded-3xl border-2 transition-all shadow-xl backdrop-blur-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-6 print-hide",
                    ambianceTheme === 'dark'
                        ? "bg-slate-900/80 border-white/10 border-b-emerald-950/60 shadow-black/40"
                        : "bg-white/90 border-slate-200 border-b-emerald-600/30 shadow-slate-300/40"
                )}>
                    {/* Sol: Geri Butonu + Logo + Başlık */}
                    <div className="flex items-center gap-3.5">
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "rounded-2xl h-11 w-11 border transition-all hover:scale-105 shrink-0",
                                ambianceTheme === 'dark'
                                    ? "text-slate-400 hover:text-white bg-white/5 border-white/10"
                                    : "text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-300"
                            )}
                        >
                            <Link href="/teacher/scales" title="Ölçekler Paneline Dön">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>

                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 border-2 border-white/20">
                            <BookOpen className="h-6 w-6" />
                        </div>

                        <div>
                            <div className="flex items-center flex-wrap gap-2">
                                <h1 className={cn(
                                    "text-xl sm:text-2xl md:text-3xl font-black tracking-tight",
                                    ambianceTheme === 'dark' ? "text-white" : "text-slate-900"
                                )}>
                                    Kur'an-ı Kerim & Cüz Takip Merkezi
                                </h1>
                                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[11px] px-2.5 py-0.5 shadow-sm border-0">
                                    Elifba Müfredatı
                                </Badge>
                                {className && (
                                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono font-bold text-xs">
                                        {className}
                                    </Badge>
                                )}
                            </div>
                            <p className={cn(
                                "text-xs sm:text-sm mt-0.5 line-clamp-1 font-medium",
                                ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600"
                            )}>
                                Akıllı tahta canlı okuma sınavı, harf aşamaları ve Kur'an-ı Kerim cüz sayfası takibi.
                            </p>
                        </div>
                    </div>

                    {/* Sağ: Eylemler & Görünüm Seçiciler */}
                    <div className="flex flex-wrap items-center gap-2">
                        
                        {/* Görünüm Modu Değiştirici: Kartlar vs Matris */}
                        <div className={cn(
                            "flex items-center p-1 rounded-2xl border text-xs font-bold shadow-inner",
                            ambianceTheme === 'dark' ? "bg-black/30 border-white/10" : "bg-slate-100 border-slate-300"
                        )}>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-black text-xs",
                                    viewMode === 'cards'
                                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40 scale-102"
                                        : ambianceTheme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                )}
                                title="Öğrenci Kartları Pano Görünümü"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Öğrenci Kartları
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('matrix')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer font-black text-xs",
                                    viewMode === 'matrix'
                                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40 scale-102"
                                        : ambianceTheme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                                )}
                                title="Detaylı Matris Tablo Görünümü"
                            >
                                <Table2 className="w-3.5 h-3.5" /> Matris Tablo
                            </button>
                        </div>

                        {/* İnteraktif Elifba & Dualar Linki */}
                        <Button
                            asChild
                            size="sm"
                            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black rounded-xl h-9 px-3.5 text-xs shadow-md shadow-amber-950/30 border border-amber-400/30 cursor-pointer"
                        >
                            <Link href="/elifba">
                                <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-200 animate-pulse" />
                                İnteraktif Elifba
                            </Link>
                        </Button>

                        {/* Koyu / Açık Tema */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAmbianceTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                            className={cn(
                                "h-9 w-9 rounded-xl border transition-colors cursor-pointer",
                                ambianceTheme === 'dark'
                                    ? "border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                            )}
                            title={ambianceTheme === 'dark' ? "Aydınlık Temaya Geç" : "Akıllı Tahta Koyu Temaya Geç"}
                        >
                            {ambianceTheme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                        </Button>

                        {/* Yazdır */}
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                            size="sm"
                            className={cn(
                                "h-9 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer",
                                ambianceTheme === 'dark'
                                    ? "border-white/10 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-white/10"
                                    : "border-slate-300 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100"
                            )}
                        >
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> Yazdır
                        </Button>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 2. CANLI KPI VE SINIF SEÇİCİ KARTLARI (4'LÜ VİTRİN) */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-hide">
                    
                    {/* 1. Sınıf & Şube Seçim Kartı */}
                    <Card className={cn(
                        "rounded-3xl border-2 transition-all shadow-lg flex flex-col justify-between p-4 border-b-6",
                        ambianceTheme === 'dark'
                            ? "bg-slate-900/80 border-white/10 border-b-indigo-900/60"
                            : "bg-white border-slate-200 border-b-indigo-500/40"
                    )}>
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                                    <Users className="w-4 h-4" /> Sınıf & Şube
                                </span>
                                <Badge variant="outline" className="text-[10px] font-mono font-bold px-2 py-0 border-indigo-500/30 text-indigo-400">
                                    {stats.total} Öğrenci
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Sınıf</label>
                                    <Select
                                        value={selectedClassId}
                                        onValueChange={(val) => {
                                            setSelectedClassId(val);
                                            const cls = allClasses.find(c => c.id === val);
                                            if (cls?.branches && cls.branches.length > 0) {
                                                setSelectedBranch(cls.branches[0]);
                                            } else {
                                                setSelectedBranch('all');
                                            }
                                        }}
                                    >
                                        <SelectTrigger className={cn(
                                            "h-8 rounded-xl text-xs font-bold border",
                                            ambianceTheme === 'dark' ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                                        )}>
                                            <SelectValue placeholder="Sınıf Seçin" />
                                        </SelectTrigger>
                                        <SelectContent className={cn(
                                            "border",
                                            ambianceTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                                        )}>
                                            {allClasses.map(c => (
                                                <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Şube</label>
                                    <Select
                                        value={selectedBranch}
                                        onValueChange={setSelectedBranch}
                                    >
                                        <SelectTrigger className={cn(
                                            "h-8 rounded-xl text-xs font-bold border",
                                            ambianceTheme === 'dark' ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                                        )}>
                                            <SelectValue placeholder="Şube" />
                                        </SelectTrigger>
                                        <SelectContent className={cn(
                                            "border",
                                            ambianceTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                                        )}>
                                            <SelectItem value="all" className="text-xs font-bold text-emerald-400">Tüm Şubeler</SelectItem>
                                            {(currentClass?.branches || []).map(b => (
                                                <SelectItem key={b} value={b} className="text-xs font-semibold">{b} Şubesi</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Hızlı Şube Hapları */}
                        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pt-2 mt-2 border-t border-white/5">
                            <button
                                onClick={() => setSelectedBranch('all')}
                                className={cn(
                                    "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer",
                                    selectedBranch === 'all'
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                Tümü
                            </button>
                            {(currentClass?.branches || []).map(b => (
                                <button
                                    key={b}
                                    onClick={() => setSelectedBranch(b)}
                                    className={cn(
                                        "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer",
                                        selectedBranch === b
                                            ? "bg-indigo-600 text-white shadow-sm"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* 2. Metrik: Kur'an / Cüz Seviyesindekiler (Zümrüt Yeşili) */}
                    <Card className={cn(
                        "rounded-3xl border-2 transition-all shadow-lg p-4 border-b-6 flex items-center gap-4 relative overflow-hidden",
                        ambianceTheme === 'dark'
                            ? "bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-slate-900/80 border-emerald-500/30 border-b-emerald-600/70"
                            : "bg-gradient-to-br from-emerald-50/80 via-white to-white border-emerald-300 border-b-emerald-600/50"
                    )}>
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30 border-2 border-white/20">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-400 block truncate">Kur'an / Cüze Geçen</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className={cn("text-3xl font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                                    {stats.quranCount}
                                </span>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-black text-xs px-2 py-0">
                                    %{stats.quranPercent}
                                </Badge>
                            </div>
                            {/* Küçük İlerleme Çubuğu */}
                            <div className="w-full bg-slate-800/40 dark:bg-black/40 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${stats.quranPercent}%` }}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* 3. Metrik: Harekeler & Kaideler (Gök Mavisi) */}
                    <Card className={cn(
                        "rounded-3xl border-2 transition-all shadow-lg p-4 border-b-6 flex items-center gap-4 relative overflow-hidden",
                        ambianceTheme === 'dark'
                            ? "bg-gradient-to-br from-sky-950/40 via-slate-900/80 to-slate-900/80 border-sky-500/30 border-b-sky-600/70"
                            : "bg-gradient-to-br from-sky-50/80 via-white to-white border-sky-300 border-b-sky-600/50"
                    )}>
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/30 border-2 border-white/20">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-400 block truncate">Harekeler ve Kaideler</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className={cn("text-3xl font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                                    {stats.harekesCount}
                                </span>
                                <span className="text-xs font-bold text-sky-400">Öğrenci</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-1">
                                Üstün, Esre, Cezm, Şedde
                            </span>
                        </div>
                    </Card>

                    {/* 4. Metrik: Harf Aşaması (Ametist Moru / Amber) */}
                    <Card className={cn(
                        "rounded-3xl border-2 transition-all shadow-lg p-4 border-b-6 flex items-center gap-4 relative overflow-hidden",
                        ambianceTheme === 'dark'
                            ? "bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-slate-900/80 border-purple-500/30 border-b-purple-600/70"
                            : "bg-gradient-to-br from-purple-50/80 via-white to-white border-purple-300 border-b-purple-600/50"
                    )}>
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 border-2 border-white/20">
                            <Award className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-400 block truncate">Harf Tanıma Aşaması</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className={cn("text-3xl font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                                    {stats.lettersCount}
                                </span>
                                <span className="text-xs font-bold text-purple-400">Öğrenci</span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-1">
                                28 Temel Harf ve Mahreç
                            </span>
                        </div>
                    </Card>

                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 3. ARAMA VE FİLTRE HAPLARI ÇUBUĞU */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className={cn(
                    "p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-sm print-hide",
                    ambianceTheme === 'dark' ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200"
                )}>
                    {/* Sol: Arama Girişi */}
                    <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Öğrenci adı veya numarası ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={cn(
                                    "h-9 pl-9 pr-8 text-xs rounded-xl font-medium border",
                                    ambianceTheme === 'dark' ? "bg-slate-950 border-white/10 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                                )}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Orta: Seviye Filtre Hapları */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar text-xs">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                statusFilter === 'all'
                                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm"
                                    : ambianceTheme === 'dark' ? "bg-slate-950 border border-white/10 text-slate-400 hover:text-white" : "bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900"
                            )}
                        >
                            Tümü ({stats.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('quran')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                statusFilter === 'quran'
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm"
                                    : ambianceTheme === 'dark' ? "bg-slate-950 border border-white/10 text-slate-400 hover:text-white" : "bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900"
                            )}
                        >
                            📖 Kur'an ({stats.quranCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('harekes')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                statusFilter === 'harekes'
                                    ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-sm"
                                    : ambianceTheme === 'dark' ? "bg-slate-950 border border-white/10 text-slate-400 hover:text-white" : "bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900"
                            )}
                        >
                            ⚡ Harekeler ({stats.harekesCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('letters')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                statusFilter === 'letters'
                                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm"
                                    : ambianceTheme === 'dark' ? "bg-slate-950 border border-white/10 text-slate-400 hover:text-white" : "bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900"
                            )}
                        >
                            🔤 Harfler ({stats.lettersCount})
                        </button>
                    </div>

                    {/* Sağ: Lejant Rozetleri */}
                    <div className="hidden xl:flex items-center gap-3 text-xs text-slate-400 font-semibold">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" /> Tamamlandı</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Çalışıyor</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Bekliyor</span>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 4. GÖRÜNÜM ALANI (KARTLAR VEYA MATRİS) */}
                {/* ──────────────────────────────────────────────────────────── */}
                {isLoadingData ? (
                    <div className="flex flex-col items-center justify-center py-28 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
                        <span className="text-sm text-slate-400 font-bold">Öğrenci okuma kayıtları yükleniyor...</span>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className={cn(
                        "text-center py-24 rounded-3xl border-2 border-dashed p-8",
                        ambianceTheme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-300"
                    )}>
                        <BookOpen className="w-14 h-14 mx-auto mb-3 opacity-30 text-emerald-400" />
                        <h3 className={cn("text-lg font-bold", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                            Eşleşen Öğrenci Bulunamadı
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Bu sınıfta veya seçili filtrede kayıtlı öğrenci yok. Arama terimini temizleyebilir veya sınıf seçebilirsiniz.
                        </p>
                    </div>
                ) : viewMode === 'cards' ? (

                    /* ──────────────────────────────────────────────────────────── */
                    /* 4.A İNTERAKTİF ÖĞRENCİ KARTLARI (PANO MODU) */
                    /* ──────────────────────────────────────────────────────────── */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredStudents.map((student, idx) => {
                            const prog = progressMap[student.uid];
                            const cuzPage = prog?.cuzPage;
                            const stageInfo = getStudentStageInfo(student.uid);

                            return (
                                <Card
                                    key={student.uid}
                                    className={cn(
                                        "rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between p-4 sm:p-5 shadow-lg hover:shadow-2xl hover:-translate-y-1 relative select-none border-b-6 group",
                                        ambianceTheme === 'dark'
                                            ? "bg-[#0f172a]/90 border-white/10 border-b-slate-900 hover:border-emerald-500/40 shadow-black/50"
                                            : "bg-white border-slate-200 border-b-slate-300 hover:border-emerald-500/50 shadow-slate-300/40"
                                    )}
                                >
                                    {/* Kart Üst Bilgisi: Avatar + İsim + No + Sıra */}
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {/* Avatar */}
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-indigo-950/40 shrink-0 border border-white/20">
                                                    {student.displayName?.charAt(0) || 'Ö'}
                                                </div>

                                                {/* İsim ve No */}
                                                <div className="min-w-0">
                                                    <h3 className={cn(
                                                        "font-black text-sm sm:text-base leading-tight truncate group-hover:text-emerald-400 transition-colors",
                                                        ambianceTheme === 'dark' ? "text-white" : "text-slate-900"
                                                    )}>
                                                        {student.displayName}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono font-bold text-slate-400">
                                                        <span>No: {student.studentNumber || '-'}</span>
                                                        <span>•</span>
                                                        <span className="text-indigo-400">#{idx + 1}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Aşama Yönetimi Popover Tetikleyici */}
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "w-7 h-7 rounded-xl flex items-center justify-center border transition-all cursor-pointer",
                                                            ambianceTheme === 'dark'
                                                                ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                                                                : "border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                        )}
                                                        title="Aşama Durumlarını Yönet"
                                                    >
                                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className={cn(
                                                    "w-72 p-3 rounded-2xl border shadow-2xl space-y-2",
                                                    ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
                                                )}>
                                                    <div className="pb-2 border-b border-white/10">
                                                        <h4 className="font-bold text-xs">{student.displayName}</h4>
                                                        <p className="text-[10px] text-slate-400">Tüm Elifba basamaklarını doğrudan işaretleyin:</p>
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                                                        {elifbaStagesList.map(stg => {
                                                            const currentStatus = prog?.stages[stg.id]?.status || 'not_started';
                                                            return (
                                                                <div key={stg.id} className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 text-xs">
                                                                    <span className="truncate max-w-[130px] font-medium text-[11px]">{stg.shortTitle}</span>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => handleSetStageStatus(student, stg.id, 'completed')}
                                                                            className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", currentStatus === 'completed' ? "bg-emerald-500 text-white font-black" : "text-slate-400 hover:text-white")}
                                                                            title="Tamamlandı"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSetStageStatus(student, stg.id, 'in_progress')}
                                                                            className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", currentStatus === 'in_progress' ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white")}
                                                                            title="Çalışıyor"
                                                                        >
                                                                            ⏳
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSetStageStatus(student, stg.id, 'not_started')}
                                                                            className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", currentStatus === 'not_started' ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white")}
                                                                            title="Sıfırla"
                                                                        >
                                                                            -
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* KART GÖVDESİ: MEVCUT AŞAMA VEYA CÜZ SAYFASI (FİZİKSEL ŞERİT) */}
                                        <div className={cn(
                                            "p-3 rounded-2xl border transition-all",
                                            cuzPage && cuzPage > 0
                                                ? ambianceTheme === 'dark' ? "bg-emerald-950/30 border-emerald-500/30" : "bg-emerald-50/70 border-emerald-300"
                                                : stageInfo.level === 'harekes'
                                                ? ambianceTheme === 'dark' ? "bg-sky-950/30 border-sky-500/30" : "bg-sky-50/70 border-sky-300"
                                                : ambianceTheme === 'dark' ? "bg-purple-950/30 border-purple-500/30" : "bg-purple-50/70 border-purple-300"
                                        )}>
                                            <div className="flex items-center justify-between text-xs font-black mb-1">
                                                <span className="flex items-center gap-1.5">
                                                    {cuzPage && cuzPage > 0 ? (
                                                        <span className="text-emerald-400 flex items-center gap-1">
                                                            <BookOpen className="w-3.5 h-3.5" /> Kur'an-ı Kerim
                                                        </span>
                                                    ) : stageInfo.level === 'harekes' ? (
                                                        <span className="text-sky-400 flex items-center gap-1">
                                                            <GraduationCap className="w-3.5 h-3.5" /> Harekeler & Kaideler
                                                        </span>
                                                    ) : (
                                                        <span className="text-purple-400 flex items-center gap-1">
                                                            <Award className="w-3.5 h-3.5" /> Temel Harfler
                                                        </span>
                                                    )}
                                                </span>

                                                <span className="font-mono text-[10px] text-slate-400">
                                                    {stageInfo.completedCount} / {elifbaStagesList.length} Aşama
                                                </span>
                                            </div>

                                            {/* Cüz Sayfası Düzenleyici & +/- Hızlı Butonlar */}
                                            {cuzPage && cuzPage > 0 ? (
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className={cn(
                                                        "text-base sm:text-lg font-black tracking-tight",
                                                        ambianceTheme === 'dark' ? "text-emerald-300" : "text-emerald-700"
                                                    )}>
                                                        {cuzPage}. Sayfa
                                                    </span>

                                                    {/* Hızlı Sayfa Butonları [-] [+] */}
                                                    <div className="flex items-center gap-1 bg-black/20 dark:bg-black/40 p-0.5 rounded-xl border border-emerald-500/20">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickChangeCuzPage(student, -1)}
                                                            className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-300 font-bold flex items-center justify-center transition-all cursor-pointer"
                                                            title="Önceki Sayfa [-1]"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickChangeCuzPage(student, +1)}
                                                            className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center transition-all cursor-pointer"
                                                            title="Sonraki Sayfa [+1]"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5 pt-1">
                                                    <span className={cn(
                                                        "text-xs sm:text-sm font-black truncate block",
                                                        ambianceTheme === 'dark' ? "text-white" : "text-slate-800"
                                                    )}>
                                                        {stageInfo.currentTitle}
                                                    </span>
                                                    {/* İlerleme Çubuğu */}
                                                    <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-400 h-full rounded-full transition-all duration-300"
                                                            style={{ width: `${stageInfo.percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Kart Alt Eylemleri: Doğrudan Akıllı Tahta Sınav Butonu */}
                                    <div className="pt-3 mt-3 border-t border-white/5 flex items-center gap-2">
                                        <Button
                                            onClick={() => handleStartLiveTest(student, 'harfler')}
                                            className="flex-1 h-9 rounded-xl font-black text-xs transition-all shadow-md bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-950/40 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-white" />
                                            <span>Canlı Test Et</span>
                                        </Button>

                                        {/* Hızlı Cüze Başlat / Cüz Sayfası Belirle */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-9 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                                        cuzPage && cuzPage > 0
                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                                            : ambianceTheme === 'dark'
                                                            ? "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                                                            : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"
                                                    )}
                                                    title="Cüz Sayfasını Belirle"
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    <span>{cuzPage && cuzPage > 0 ? `${cuzPage}p` : 'Cüz'}</span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className={cn(
                                                "w-52 p-3 rounded-2xl border shadow-xl space-y-2",
                                                ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
                                            )}>
                                                <span className="text-xs font-bold block">Cüz Sayfası Ata</span>
                                                <div className="flex items-center gap-1.5">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={604}
                                                        defaultValue={cuzPage || ''}
                                                        id={`cuz-input-${student.uid}`}
                                                        placeholder="Sayfa No (1-604)"
                                                        className={cn(
                                                            "h-8 text-xs font-bold rounded-xl border",
                                                            ambianceTheme === 'dark' ? "bg-slate-950 border-white/15 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                                                        )}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const el = document.getElementById(`cuz-input-${student.uid}`) as HTMLInputElement;
                                                            if (el) handleSaveCuzPage(student, parseInt(el.value, 10));
                                                        }}
                                                        className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                                                    >
                                                        Kaydet
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                ) : (

                    /* ──────────────────────────────────────────────────────────── */
                    /* 4.B KUŞBAKIŞI MATRİS TABLO GÖRÜNÜMÜ */
                    /* ──────────────────────────────────────────────────────────── */
                    <Card className={cn(
                        "rounded-3xl border-2 transition-all shadow-2xl overflow-hidden border-b-6",
                        ambianceTheme === 'dark'
                            ? "bg-[#0f172a]/95 border-white/10 border-b-cyan-950/60 shadow-black/60"
                            : "bg-white border-slate-200 border-b-cyan-600/30 shadow-slate-300/40"
                    )}>
                        <div className="relative max-h-[72vh] overflow-auto custom-scrollbar">
                            <table className="w-full border-separate border-spacing-0 text-left">
                                <thead>
                                    <tr>
                                        {/* Sabit Sol Sütun: Öğrenci Adı */}
                                        <th className={cn(
                                            "sticky top-0 left-0 z-40 font-black text-xs px-4 py-3.5 border-b border-r min-w-[220px] shadow-sm",
                                            ambianceTheme === 'dark'
                                                ? "bg-slate-900 text-white border-white/10"
                                                : "bg-slate-100 text-slate-900 border-slate-300"
                                        )}>
                                            Öğrenci Adı & No
                                        </th>

                                        {/* Kur'an / Cüz Sayfa Sütunu */}
                                        <th className={cn(
                                            "sticky top-0 z-30 font-black text-xs px-3 py-3.5 border-b border-r text-center min-w-[130px]",
                                            ambianceTheme === 'dark'
                                                ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/20"
                                                : "bg-emerald-100/90 text-emerald-900 border-emerald-300"
                                        )}>
                                            📖 Cüz / Sayfa
                                        </th>

                                        {/* 16 Elifba Aşaması Sütun Başlıkları */}
                                        {elifbaStagesList.map((stage) => (
                                            <th
                                                key={stage.id}
                                                className={cn(
                                                    "sticky top-0 z-20 font-black text-[11px] px-2 py-3 border-b border-r text-center min-w-[85px] whitespace-nowrap",
                                                    ambianceTheme === 'dark'
                                                        ? "bg-slate-900/95 text-slate-300 border-white/10"
                                                        : "bg-slate-100/95 text-slate-700 border-slate-300"
                                                )}
                                                title={`${stage.title} (${stage.itemCount} kart)`}
                                            >
                                                <span className="block font-black">{stage.shortTitle}</span>
                                                <span className="text-[9px] font-mono opacity-60 font-normal">{stage.itemCount} kart</span>
                                            </th>
                                        ))}

                                        {/* Hızlı Aksiyon Sütunu */}
                                        <th className={cn(
                                            "sticky top-0 right-0 z-30 font-black text-xs px-3 py-3 border-b text-center min-w-[130px] print-hide",
                                            ambianceTheme === 'dark'
                                                ? "bg-slate-900 text-white border-white/10"
                                                : "bg-slate-100 text-slate-900 border-slate-300"
                                        )}>
                                            İşlem
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className={cn("divide-y", ambianceTheme === 'dark' ? "divide-white/5" : "divide-slate-200")}>
                                    {filteredStudents.map((student, sIdx) => {
                                        const prog = progressMap[student.uid];
                                        const cuzPage = prog?.cuzPage;

                                        return (
                                            <tr
                                                key={student.uid}
                                                className={cn(
                                                    "transition-colors group",
                                                    ambianceTheme === 'dark' ? "hover:bg-white/[0.03]" : "hover:bg-slate-50"
                                                )}
                                            >
                                                {/* Sabit Öğrenci İsmi */}
                                                <td className={cn(
                                                    "sticky left-0 z-20 font-black text-xs px-4 py-3 border-r flex items-center gap-2.5",
                                                    ambianceTheme === 'dark'
                                                        ? "bg-slate-900 group-hover:bg-slate-900/95 text-white border-white/10"
                                                        : "bg-white group-hover:bg-slate-50 text-slate-900 border-slate-200"
                                                )}>
                                                    <span className="text-slate-500 font-mono text-[10px] w-5 text-right">{sIdx + 1}.</span>
                                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-[10px] shrink-0 shadow-sm">
                                                        {student.displayName?.charAt(0) || 'Ö'}
                                                    </div>
                                                    <div className="truncate min-w-0">
                                                        <span className="truncate block max-w-[150px]">{student.displayName}</span>
                                                        <span className="text-[10px] font-mono text-slate-400 font-normal">#{student.studentNumber || '-'}</span>
                                                    </div>
                                                </td>

                                                {/* Cüz / Sayfa Hücresi */}
                                                <td className={cn(
                                                    "text-center px-2 py-2 border-r",
                                                    ambianceTheme === 'dark' ? "bg-emerald-950/15 border-white/10" : "bg-emerald-50/40 border-slate-200"
                                                )}>
                                                    {editingCuzStudentUid === student.uid ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={604}
                                                                value={tempCuzPage}
                                                                onChange={(e) => setTempCuzPage(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveCuzPage(student)}
                                                                className="w-16 h-7 text-xs bg-slate-950 border-emerald-500/50 text-emerald-300 text-center font-black p-0 rounded-lg"
                                                                autoFocus
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleSaveCuzPage(student)}
                                                                className="h-7 w-7 text-emerald-400 hover:text-white cursor-pointer"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setEditingCuzStudentUid(student.uid);
                                                                setTempCuzPage(cuzPage ? cuzPage.toString() : '');
                                                            }}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-xl text-xs font-black transition-all border inline-flex items-center gap-1 cursor-pointer",
                                                                cuzPage && cuzPage > 0
                                                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
                                                                    : ambianceTheme === 'dark' ? "bg-slate-900 border-white/5 text-slate-500 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                                                            )}
                                                            title="Cüz sayfasını düzenle"
                                                        >
                                                            {cuzPage && cuzPage > 0 ? (
                                                                <><span>{cuzPage}. Sayfa</span><Edit3 className="w-2.5 h-2.5 opacity-60" /></>
                                                            ) : (
                                                                <><span>-</span><Edit3 className="w-2.5 h-2.5 opacity-60" /></>
                                                            )}
                                                        </button>
                                                    )}
                                                </td>

                                                {/* 16 Aşama Hücreleri */}
                                                {elifbaStagesList.map((stage) => {
                                                    const stageStatus = prog?.stages[stage.id]?.status || 'not_started';
                                                    const score = prog?.stages[stage.id]?.score;

                                                    return (
                                                        <td key={stage.id} className={cn("text-center px-1 py-2 border-r", ambianceTheme === 'dark' ? "border-white/5" : "border-slate-200")}>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className={cn(
                                                                            "w-11 h-8 rounded-xl font-black text-xs transition-all border inline-flex flex-col items-center justify-center cursor-pointer shadow-sm",
                                                                            stageStatus === 'completed'
                                                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-emerald-950/20"
                                                                                : stageStatus === 'in_progress'
                                                                                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 animate-pulse"
                                                                                : ambianceTheme === 'dark' ? "bg-slate-900/50 border-white/5 text-slate-600 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-800"
                                                                        )}
                                                                    >
                                                                        {stageStatus === 'completed' ? (
                                                                            <span>✓</span>
                                                                        ) : stageStatus === 'in_progress' ? (
                                                                            <span>⏳</span>
                                                                        ) : (
                                                                            <span>-</span>
                                                                        )}
                                                                        {score !== undefined && stageStatus === 'completed' && (
                                                                            <span className="text-[8px] font-mono opacity-70 leading-none">%{score}</span>
                                                                        )}
                                                                    </button>
                                                                </PopoverTrigger>

                                                                <PopoverContent className={cn(
                                                                    "w-56 p-2 rounded-2xl border shadow-2xl space-y-1.5",
                                                                    ambianceTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                                                                )}>
                                                                    <div className="px-2 py-1 border-b border-white/5">
                                                                        <p className="text-xs font-bold">{student.displayName}</p>
                                                                        <p className="text-[10px] text-emerald-400 font-medium">{stage.title}</p>
                                                                    </div>

                                                                    <div className="space-y-1">
                                                                        <button
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'completed')}
                                                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                                                                        >
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                                            ✓ Tamamlandı Yap
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'in_progress')}
                                                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer"
                                                                        >
                                                                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                                            ⏳ Çalışıyor / Kaldığı Yer
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'not_started')}
                                                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors cursor-pointer"
                                                                        >
                                                                            <Minus className="w-3.5 h-3.5" />
                                                                            — Başlamadı (Sıfırla)
                                                                        </button>
                                                                    </div>

                                                                    <div className="pt-1 border-t border-white/5">
                                                                        <button
                                                                            onClick={() => handleStartLiveTest(student, stage.id)}
                                                                            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer"
                                                                        >
                                                                            <Play className="w-3.5 h-3.5 fill-white" />
                                                                            Tahtada Canlı Test Et
                                                                        </button>
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </td>
                                                    );
                                                })}

                                                {/* Sağ Hızlı İşlem: Test Et Butonu */}
                                                <td className={cn("text-center px-3 py-2 border-b print-hide", ambianceTheme === 'dark' ? "border-white/5" : "border-slate-200")}>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleStartLiveTest(student, 'harfler')}
                                                        className="h-8 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                                                        Test Et
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

            </div>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* 5. AKILLI TAHTA CANLI OKUMA VE SINAV MODALI */}
            {/* ──────────────────────────────────────────────────────────── */}
            {isLiveTestOpen && testingStudent && (
                <LiveQuranTester
                    isOpen={isLiveTestOpen}
                    onClose={() => setIsLiveTestOpen(false)}
                    student={testingStudent}
                    allStudents={filteredStudents}
                    onSelectStudent={(s) => setTestingStudent(s)}
                    currentProgress={progressMap[testingStudent.uid]}
                    initialStageId={testingStageId}
                    classId={selectedClassId}
                    className={className}
                    branch={selectedBranch}
                    onProgressSaved={() => loadTrackerData()}
                />
            )}

        </div>
    );
}
