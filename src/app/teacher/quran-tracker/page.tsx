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
    ChevronDown,
    Flame,
    GraduationCap,
    Award,
    Edit3,
    Check,
    Loader2,
    Play
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

    // Cüz Sayfasını Kaydet
    const handleSaveCuzPage = async (student: UserProfile) => {
        const pageNum = parseInt(tempCuzPage, 10);
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

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            
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

            {/* Arka Plan Glow Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0 print-hide">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-emerald-900/10 rounded-full blur-[160px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[160px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
            </div>

            <div className="max-w-[98%] mx-auto relative z-10 space-y-6">

                {/* ÜST GEZİNME VE BAŞLIK */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 print-hide">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl h-12 w-12 border border-white/5">
                            <Link href="/teacher/scales">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-950/40 shrink-0">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                                    Kur'an-ı Kerim & Cüz Takip Merkezi
                                </h1>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
                                    Elifba Müfredatı
                                </Badge>
                            </div>
                            <p className="text-slate-400 text-xs md:text-sm mt-0.5">
                                Harflerden Kur'an okumaya ve Cüz sayfalarına kadar kayıtlı öğrencilerin tüm okuma basamakları.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            asChild
                            variant="default"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 px-4 text-xs font-bold shadow-lg shadow-emerald-950/40 border border-emerald-400/30"
                        >
                            <Link href="/elifba">
                                <Sparkles className="mr-2 h-4 w-4 text-amber-300 animate-pulse" /> İnteraktif Elifba & Dualar
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                            size="sm"
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900/80 rounded-xl h-10 px-3.5 text-xs font-bold shadow-sm"
                        >
                            <Printer className="mr-2 h-4 w-4" /> Yazdır
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-900/80 rounded-xl h-10 px-3.5 text-xs font-bold shadow-sm"
                        >
                            <Link href="/teacher/scales">
                                <Scale className="mr-2 h-4 w-4" /> Ölçekler Paneli
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* SINIF SEÇİCİ VE İSTATİSTİK KARTLARI */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 print-hide">
                    {/* Sınıf & Şube Seçim Kutusu */}
                    <Card className="bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-xl rounded-3xl p-4 flex flex-col justify-between">
                        <div className="space-y-3">
                            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Sınıf ve Şube
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Sınıf</label>
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
                                        <SelectTrigger className="bg-slate-950 border-white/10 text-white h-9 rounded-xl text-xs">
                                            <SelectValue placeholder="Sınıf Seçin" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            {allClasses.map(c => (
                                                <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Şube</label>
                                    <Select
                                        value={selectedBranch}
                                        onValueChange={setSelectedBranch}
                                    >
                                        <SelectTrigger className="bg-slate-950 border-white/10 text-white h-9 rounded-xl text-xs">
                                            <SelectValue placeholder="Şube" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                                            <SelectItem value="all" className="text-xs font-bold text-emerald-400">Tüm Şubeler</SelectItem>
                                            {(currentClass?.branches || []).map(b => (
                                                <SelectItem key={b} value={b} className="text-xs">{b} Şubesi</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-white/5 mt-2">
                            <span>Kayıtlı Öğrenci:</span>
                            <span className="font-black text-white">{stats.total} Kişi</span>
                        </div>
                    </Card>

                    {/* Metrik 1: Kur'an'a Geçenler */}
                    <Card className="bg-gradient-to-br from-emerald-950/40 via-slate-900/70 to-slate-900/70 backdrop-blur-xl border border-emerald-500/20 shadow-xl rounded-3xl p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-lg shadow-emerald-950/40">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400">Kur'an / Cüze Geçen</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-2xl font-black text-white">{stats.quranCount}</span>
                                <span className="text-xs font-bold text-emerald-400">(%{stats.quranPercent})</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Doğrudan sayfa takibinde</span>
                        </div>
                    </Card>

                    {/* Metrik 2: Harekeler & Kurallarda Olanlar */}
                    <Card className="bg-gradient-to-br from-sky-950/40 via-slate-900/70 to-slate-900/70 backdrop-blur-xl border border-sky-500/20 shadow-xl rounded-3xl p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30 shadow-lg shadow-sky-950/40">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400">Harekeler ve Kurallar</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-2xl font-black text-white">{stats.harekesCount}</span>
                                <span className="text-xs font-bold text-sky-400">Öğrenci</span>
                            </div>
                            <span className="text-[10px] text-slate-500">Üstün, Esre, Cezm, Şedde</span>
                        </div>
                    </Card>

                    {/* Metrik 3: Harf Aşamasındakiler */}
                    <Card className="bg-gradient-to-br from-purple-950/40 via-slate-900/70 to-slate-900/70 backdrop-blur-xl border border-purple-500/20 shadow-xl rounded-3xl p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 shadow-lg shadow-purple-950/40">
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400">Harf Tanıma Aşaması</span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-2xl font-black text-white">{stats.lettersCount}</span>
                                <span className="text-xs font-bold text-purple-400">Öğrenci</span>
                            </div>
                            <span className="text-[10px] text-slate-500">28 temel harf okunuşu</span>
                        </div>
                    </Card>
                </div>

                {/* KUŞBAKIŞI TAKİP MATRİSİ */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden rounded-3xl">
                    {/* Tablo Üst Kontrolleri */}
                    <CardHeader className="bg-slate-800/40 border-b border-white/5 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 print-hide">
                        <div className="flex items-center gap-3">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    placeholder="Öğrenci ara..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-9 pl-9 text-xs bg-slate-950/80 border-white/10 text-white rounded-xl focus-visible:ring-emerald-500/40"
                                />
                            </div>

                            {/* Filtre Butonları */}
                            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs">
                                <button
                                    onClick={() => setStatusFilter('all')}
                                    className={cn("px-2.5 py-1 rounded-lg font-bold transition-all", statusFilter === 'all' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    Tümü
                                </button>
                                <button
                                    onClick={() => setStatusFilter('quran')}
                                    className={cn("px-2.5 py-1 rounded-lg font-bold transition-all", statusFilter === 'quran' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    Kur'an'dakiler
                                </button>
                                <button
                                    onClick={() => setStatusFilter('harekes')}
                                    className={cn("px-2.5 py-1 rounded-lg font-bold transition-all", statusFilter === 'harekes' ? "bg-sky-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    Harekeler
                                </button>
                                <button
                                    onClick={() => setStatusFilter('letters')}
                                    className={cn("px-2.5 py-1 rounded-lg font-bold transition-all", statusFilter === 'letters' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    Harfler
                                </button>
                            </div>
                        </div>

                        {/* Lejant / Renk Anlamları */}
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Tamamlandı (✓)</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Çalışıyor (⏳)</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-600" /> Bekliyor (-)</span>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="relative max-h-[70vh] overflow-auto custom-scrollbar">
                            {isLoadingData ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                                    <span className="text-xs text-slate-400 font-bold">Öğrenci okuma verileri yükleniyor...</span>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="text-center py-20 text-slate-400">
                                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                                    <p className="text-base font-bold text-white">Öğrenci bulunamadı</p>
                                    <p className="text-xs text-slate-500 mt-1">Bu sınıfta kayıtlı veya aramayla eşleşen öğrenci yok.</p>
                                </div>
                            ) : (
                                <table className="w-full border-separate border-spacing-0 text-left">
                                    <thead>
                                        <tr>
                                            {/* Sabit Sol Sütun: Öğrenci Adı */}
                                            <th className="sticky top-0 left-0 z-40 bg-slate-800 text-slate-300 font-bold text-xs px-4 py-3 border-b border-r border-white/10 min-w-[200px] shadow-[1px_1px_0px_0px_rgba(255,255,255,0.05)]">
                                                Öğrenci Adı
                                            </th>

                                            {/* Kur'an / Cüz Sayfa Sütunu */}
                                            <th className="sticky top-0 z-30 bg-emerald-950/80 text-emerald-300 font-black text-xs px-3 py-3 border-b border-r border-emerald-500/20 text-center min-w-[120px]">
                                                📖 Cüz / Sayfa
                                            </th>

                                            {/* 16 Elifba Aşaması Sütun Başlıkları */}
                                            {ELIFBA_STAGES.filter(s => s.category !== 'quran').map((stage) => (
                                                <th
                                                    key={stage.id}
                                                    className="sticky top-0 z-20 bg-slate-800/95 text-slate-300 font-bold text-[11px] px-2 py-3 border-b border-r border-white/10 text-center min-w-[85px] whitespace-nowrap"
                                                    title={`${stage.title} (${stage.itemCount} kart)`}
                                                >
                                                    <span className="block font-black">{stage.shortTitle}</span>
                                                    <span className="text-[9px] font-mono text-slate-500 font-normal">{stage.itemCount} kart</span>
                                                </th>
                                            ))}

                                            {/* Hızlı Aksiyon Sütunu */}
                                            <th className="sticky top-0 right-0 z-30 bg-slate-800 text-slate-300 font-bold text-xs px-3 py-3 border-b border-white/10 text-center min-w-[130px] print-hide">
                                                İşlem
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredStudents.map((student, sIdx) => {
                                            const prog = progressMap[student.uid];
                                            const cuzPage = prog?.cuzPage;

                                            return (
                                                <tr key={student.uid} className="hover:bg-white/[0.02] transition-colors group">
                                                    
                                                    {/* Sabit Öğrenci İsmi */}
                                                    <td className="sticky left-0 z-20 bg-slate-900 group-hover:bg-slate-900/90 text-white font-bold text-xs px-4 py-2.5 border-r border-white/10 flex items-center gap-2">
                                                        <span className="text-slate-500 font-mono text-[10px] w-5 text-right">{sIdx + 1}.</span>
                                                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-black flex items-center justify-center text-[10px] shrink-0 border border-indigo-500/30">
                                                            {student.displayName?.charAt(0) || 'Ö'}
                                                        </div>
                                                        <span className="truncate max-w-[140px]">{student.displayName}</span>
                                                    </td>

                                                    {/* Cüz / Sayfa Hücresi */}
                                                    <td className="text-center px-2 py-2 border-r border-white/10 bg-emerald-950/10">
                                                        {editingCuzStudentUid === student.uid ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={604}
                                                                    value={tempCuzPage}
                                                                    onChange={(e) => setTempCuzPage(e.target.value)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveCuzPage(student)}
                                                                    className="w-16 h-7 text-xs bg-slate-950 border-emerald-500/50 text-emerald-300 text-center font-bold p-0 rounded-lg"
                                                                    autoFocus
                                                                />
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    onClick={() => handleSaveCuzPage(student)}
                                                                    className="h-7 w-7 text-emerald-400 hover:text-white"
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
                                                                    "px-2.5 py-1 rounded-xl text-xs font-black transition-all border inline-flex items-center gap-1 group/cuz",
                                                                    cuzPage && cuzPage > 0
                                                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                                                                        : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/20 hover:text-white"
                                                                )}
                                                                title="Cüz sayfasını düzenle"
                                                            >
                                                                {cuzPage && cuzPage > 0 ? (
                                                                    <><span>{cuzPage}. Sayfa</span><Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/cuz:opacity-100 transition-opacity" /></>
                                                                ) : (
                                                                    <><span>-</span><Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/cuz:opacity-100 transition-opacity" /></>
                                                                )}
                                                            </button>
                                                        )}
                                                    </td>

                                                    {/* 16 Aşama Hücreleri */}
                                                    {ELIFBA_STAGES.filter(s => s.category !== 'quran').map((stage) => {
                                                        const stageStatus = prog?.stages[stage.id]?.status || 'not_started';
                                                        const score = prog?.stages[stage.id]?.score;

                                                        return (
                                                            <td key={stage.id} className="text-center px-1 py-2 border-r border-white/5">
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            className={cn(
                                                                                "w-11 h-8 rounded-xl font-black text-xs transition-all border inline-flex flex-col items-center justify-center cursor-pointer shadow-sm",
                                                                                stageStatus === 'completed'
                                                                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                                                                                    : stageStatus === 'in_progress'
                                                                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 animate-pulse"
                                                                                    : "bg-slate-900/50 border-white/5 text-slate-600 hover:border-white/20 hover:text-slate-400"
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

                                                                    <PopoverContent className="w-56 p-2 bg-slate-900 border-white/10 text-white rounded-2xl shadow-2xl space-y-1.5">
                                                                        <div className="px-2 py-1 border-b border-white/5">
                                                                            <p className="text-xs font-bold text-white">{student.displayName}</p>
                                                                            <p className="text-[10px] text-emerald-400">{stage.title}</p>
                                                                        </div>

                                                                        <div className="space-y-1">
                                                                            <button
                                                                                onClick={() => handleSetStageStatus(student, stage.id, 'completed')}
                                                                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors"
                                                                            >
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                                                ✓ Tamamlandı Yap
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleSetStageStatus(student, stage.id, 'in_progress')}
                                                                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors"
                                                                            >
                                                                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                                                                ⏳ Çalışıyor / Kaldığı Yer
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleSetStageStatus(student, stage.id, 'not_started')}
                                                                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
                                                                            >
                                                                                <Minus className="w-3.5 h-3.5" />
                                                                                — Başlamadı (Sıfırla)
                                                                            </button>
                                                                        </div>

                                                                        <div className="pt-1 border-t border-white/5">
                                                                            <button
                                                                                onClick={() => handleStartLiveTest(student, stage.id)}
                                                                                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40"
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
                                                    <td className="text-center px-3 py-2 border-b border-white/5 print-hide">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStartLiveTest(student, 'harfler')}
                                                            className="h-8 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95"
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
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* AKILLI TAHTA CANLI OKUMA VE SINAV MODALI */}
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
