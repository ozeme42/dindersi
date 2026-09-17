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
    VolumeX,
    Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
    ELIFBA_STAGES, 
    DIYANET_ELIFBA_STAGES, 
    DIYANET_SECTIONS, 
    ElifbaStage, 
    getDiyanetStepNumber, 
    getDiyanetStageByStep, 
    getNextDiyanetStage, 
    mapLegacyStageIdToDiyanet, 
    isDiyanetStageCompleted 
} from '@/lib/elifba-curriculum';
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

    // Görünüm & Tema Modları
    const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
    const [ambianceTheme, setAmbianceTheme] = useState<'dark' | 'light'>('dark');

    // Filtre & Arama
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'quran' | 'advanced' | 'cezm_med' | 'letters'>('all');
    const [matrixSection, setMatrixSection] = useState<'all' | 'section1' | 'section2' | 'section3' | 'section4'>('all');

    // Canlı Test Modalı State
    const [isLiveTestOpen, setIsLiveTestOpen] = useState<boolean>(false);
    const [testingStudent, setTestingStudent] = useState<UserProfile | null>(null);
    const [testingStageId, setTestingStageId] = useState<string>('cuz1');

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

    // Özet İstatistikler (Diyanet 30 Adım Esaslı)
    const stats = useMemo(() => {
        const total = students.length;
        let quranCount = 0;      // Adım 30
        let advancedCount = 0;   // Adım 20-29 (Tenvin, İleri Kaideler, Dualar)
        let cezmMedCount = 0;    // Adım 9-19 (Cezm, Med, Şedde)
        let lettersCount = 0;    // Adım 1-8 (Harfler ve Harekeler)

        students.forEach(s => {
            const prog = progressMap[s.uid];
            if (!prog) {
                lettersCount++;
                return;
            }

            if ((prog.cuzPage && prog.cuzPage > 0) || isDiyanetStageCompleted(prog.stages, 'cuz')) {
                quranCount++;
            } else {
                const stepNum = getDiyanetStepNumber(prog.currentStageId || 'cuz1', prog.cuzPage);
                if (stepNum >= 20) {
                    advancedCount++;
                } else if (stepNum >= 9) {
                    cezmMedCount++;
                } else {
                    lettersCount++;
                }
            }
        });

        const quranPercent = total > 0 ? Math.round((quranCount / total) * 100) : 0;
        return { total, quranCount, advancedCount, cezmMedCount, lettersCount, quranPercent };
    }, [students, progressMap]);

    // Hızlı Aşama Durumu Değiştirme
    const handleSetStageStatus = async (
        student: UserProfile,
        stageId: string,
        newStatus: 'completed' | 'in_progress' | 'not_started'
    ) => {
        const resolvedId = mapLegacyStageIdToDiyanet(stageId);
        const res = await saveStudentQuranProgress({
            studentUid: student.uid,
            studentName: student.displayName || '',
            studentNumber: student.studentNumber,
            classId: selectedClassId,
            className,
            branch: selectedBranch,
            stageId: resolvedId,
            status: newStatus,
            score: newStatus === 'completed' ? 100 : undefined
        });

        if (res.success) {
            setProgressMap(prev => {
                const current = prev[student.uid] || {
                    id: student.uid,
                    studentUid: student.uid,
                    studentName: student.displayName || '',
                    classId: selectedClassId,
                    className,
                    branch: selectedBranch,
                    currentStageId: resolvedId,
                    stages: {}
                };
                return {
                    ...prev,
                    [student.uid]: {
                        ...current,
                        stages: {
                            ...current.stages,
                            [resolvedId]: {
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
    const handleStartLiveTest = (student: UserProfile, stageId: string = 'cuz1') => {
        const resolvedId = mapLegacyStageIdToDiyanet(stageId);
        setTestingStudent(student);
        setTestingStageId(resolvedId);
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
            const isQuran = (prog?.cuzPage && prog.cuzPage > 0) || isDiyanetStageCompleted(prog?.stages, 'cuz');
            const stepNum = prog ? getDiyanetStepNumber(prog.currentStageId || 'cuz1', prog.cuzPage) : 1;

            if (statusFilter === 'quran') return isQuran;
            if (statusFilter === 'advanced') return !isQuran && stepNum >= 20;
            if (statusFilter === 'cezm_med') return !isQuran && stepNum >= 9 && stepNum < 20;
            if (statusFilter === 'letters') return !isQuran && stepNum < 9;
            return true;
        });
    }, [students, searchTerm, statusFilter, progressMap]);

    // Diyanet 30 Aşamalı Öğrenci İlerleme Bilgisi
    const getStudentStageInfo = useCallback((studentUid: string) => {
        const prog = progressMap[studentUid];
        if (!prog) {
            const stage1 = DIYANET_ELIFBA_STAGES[0];
            return {
                stepNumber: 1,
                level: 'letters' as const,
                currentTitle: stage1.shortTitle,
                fullTitle: stage1.title,
                completedCount: 0,
                percent: 0,
                badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                sectionTitle: stage1.sectionTitle,
                currentStageId: stage1.id
            };
        }

        if (prog.cuzPage && prog.cuzPage > 0) {
            return {
                stepNumber: 30,
                level: 'quran' as const,
                currentTitle: `Kur'an (Sayfa ${prog.cuzPage})`,
                fullTitle: `Adım 30: Kur'an-ı Kerim / Cüz (Sayfa ${prog.cuzPage})`,
                completedCount: 30,
                percent: 100,
                badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                sectionTitle: "IV. Bölüm: Dualar ve Kur'an-ı Kerim",
                currentStageId: 'cuz'
            };
        }

        let completedCount = 0;
        let highestCompletedStep = 0;

        for (const stage of DIYANET_ELIFBA_STAGES) {
            if (stage.category === 'quran') continue;
            if (isDiyanetStageCompleted(prog.stages, stage.id)) {
                completedCount++;
                if (stage.stepNumber > highestCompletedStep) {
                    highestCompletedStep = stage.stepNumber;
                }
            }
        }

        let activeStep = 1;
        if (prog.currentStageId) {
            activeStep = getDiyanetStepNumber(prog.currentStageId, prog.cuzPage);
        } else if (highestCompletedStep > 0) {
            activeStep = Math.min(30, highestCompletedStep + 1);
        }

        const activeStage = getDiyanetStageByStep(activeStep) || DIYANET_ELIFBA_STAGES[0];
        const percent = Math.min(100, Math.round((completedCount / 30) * 100));

        let level: 'letters' | 'cezm_med' | 'advanced' | 'dualar' | 'quran' = 'letters';
        let badgeColor = 'bg-teal-500/20 text-teal-300 border-teal-500/40';

        if (activeStep >= 30) {
            level = 'quran';
            badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        } else if (activeStep === 29) {
            level = 'dualar';
            badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
        } else if (activeStep >= 20) {
            level = 'advanced';
            badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        } else if (activeStep >= 9) {
            level = 'cezm_med';
            badgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
        } else {
            level = 'letters';
            badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        }

        return {
            stepNumber: activeStep,
            level,
            currentTitle: activeStage.shortTitle,
            fullTitle: activeStage.title,
            completedCount,
            percent,
            badgeColor,
            sectionTitle: activeStage.sectionTitle,
            currentStageId: activeStage.id
        };
    }, [progressMap]);

    // Matris için filtrelenmiş aşama sütunları
    const matrixStages = useMemo(() => {
        if (matrixSection === 'all') {
            return DIYANET_ELIFBA_STAGES.filter(s => s.category !== 'quran');
        }
        return DIYANET_ELIFBA_STAGES.filter(s => s.section === matrixSection && s.category !== 'quran');
    }, [matrixSection]);

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
                th, td { border: 1px solid black !important; padding: 4px !important; color: black !important; font-size: 8pt !important; text-align: center !important; }
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

            <div className="max-w-[1750px] mx-auto p-3 sm:p-6 md:p-8 relative z-10 space-y-6">

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 1. ÜST GEZİNME, BAŞLIK VE KONTROLLER */}
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
                                    Kur&apos;an-ı Kerim &amp; Elifba Takip Merkezi
                                </h1>
                                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-[11px] px-2.5 py-0.5 shadow-sm border-0">
                                    Diyanet 30 Adım Müfredatı
                                </Badge>
                                {className && (
                                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 font-mono font-bold text-xs">
                                        {className}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                                Diyanet İşleri Başkanlığı Elifba basamakları ile adım adım canlı sözlü test ve gelişim takibi
                            </p>
                        </div>
                    </div>

                    {/* Sağ: Sınıf / Şube Seçicileri + Görünüm Modu + Yazdır */}
                    <div className="flex items-center flex-wrap gap-2.5">
                        
                        {/* Sınıf Seçici */}
                        <Select
                            value={selectedClassId}
                            onValueChange={(val) => {
                                setSelectedClassId(val);
                                const cls = allClasses.find(c => c.id === val);
                                if (cls && cls.branches && cls.branches.length > 0) {
                                    setSelectedBranch(cls.branches[0]);
                                } else {
                                    setSelectedBranch('all');
                                }
                            }}
                            disabled={isLoadingClasses}
                        >
                            <SelectTrigger className={cn(
                                "w-[140px] sm:w-[160px] h-10 rounded-2xl font-bold text-xs border transition-all",
                                ambianceTheme === 'dark' ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                            )}>
                                <SelectValue placeholder="Sınıf Seç" />
                            </SelectTrigger>
                            <SelectContent className={ambianceTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white"}>
                                {allClasses.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="font-semibold text-xs">
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Şube Seçici */}
                        {currentClass && currentClass.branches && currentClass.branches.length > 0 && (
                            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                <SelectTrigger className={cn(
                                    "w-[110px] sm:w-[130px] h-10 rounded-2xl font-bold text-xs border transition-all",
                                    ambianceTheme === 'dark' ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-300 text-slate-900"
                                )}>
                                    <SelectValue placeholder="Şube Seç" />
                                </SelectTrigger>
                                <SelectContent className={ambianceTheme === 'dark' ? "bg-slate-900 border-white/10 text-white" : "bg-white"}>
                                    <SelectItem value="all" className="font-semibold text-xs">Tüm Şubeler</SelectItem>
                                    {currentClass.branches.map(b => (
                                        <SelectItem key={b} value={b} className="font-semibold text-xs">
                                            {b} Şubesi
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Görünüm Modu Değiştirici: Kartlar vs Matris */}
                        <div className={cn(
                            "flex items-center p-1 rounded-2xl border transition-all",
                            ambianceTheme === 'dark' ? "bg-slate-950 border-white/10" : "bg-slate-100 border-slate-300"
                        )}>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    viewMode === 'cards'
                                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40"
                                        : "text-slate-400 hover:text-white"
                                )}
                                title="Kart / Pano Görünümü"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Pano</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('matrix')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    viewMode === 'matrix'
                                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40"
                                        : "text-slate-400 hover:text-white"
                                )}
                                title="Kuşbakışı Detaylı Tablo Görünümü"
                            >
                                <Table2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Matris (30 Adım)</span>
                            </button>
                        </div>

                        {/* Aydınlık / Karanlık Tema Değiştirici */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setAmbianceTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                            className={cn(
                                "h-10 w-10 rounded-2xl border transition-all cursor-pointer",
                                ambianceTheme === 'dark'
                                    ? "bg-slate-950 border-white/10 text-amber-300 hover:bg-white/10"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                            )}
                            title="Akıllı Tahta / Aydınlık Sınıf Teması"
                        >
                            {ambianceTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>

                        {/* Yazdır / PDF Butonu */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className={cn(
                                "h-10 px-3 rounded-2xl font-bold text-xs border transition-all cursor-pointer",
                                ambianceTheme === 'dark'
                                    ? "bg-slate-950 border-white/10 text-slate-300 hover:text-white hover:bg-white/10"
                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                            )}
                            title="Sınıf Elifba Çizelgesini Yazdır"
                        >
                            <Printer className="h-4 w-4 mr-1.5" />
                            <span className="hidden sm:inline">Yazdır</span>
                        </Button>

                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 2. DİYANET 30 ADIM İSTATİSTİK ŞERİDİ */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 print-hide">
                    {/* 1. Toplam Öğrenci */}
                    <div className={cn(
                        "p-4 rounded-3xl border-2 transition-all shadow-md flex items-center gap-3.5 border-b-4",
                        ambianceTheme === 'dark' ? "bg-slate-900/60 border-white/10 border-b-slate-800" : "bg-white border-slate-200 border-b-slate-300"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-400">Toplam Öğrenci</div>
                            <div className="text-xl sm:text-2xl font-black">{stats.total}</div>
                        </div>
                    </div>

                    {/* 2. Harfler & Harekeler (Adım 1 - 8) */}
                    <div className={cn(
                        "p-4 rounded-3xl border-2 transition-all shadow-md flex items-center gap-3.5 border-b-4",
                        ambianceTheme === 'dark' ? "bg-slate-900/60 border-white/10 border-b-emerald-950" : "bg-white border-slate-200 border-b-emerald-600/30"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <Award className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-400">Harf &amp; Harekeler (1-8)</div>
                            <div className="text-xl sm:text-2xl font-black text-emerald-400">{stats.lettersCount}</div>
                        </div>
                    </div>

                    {/* 3. Cezm, Med & Şedde (Adım 9 - 19) */}
                    <div className={cn(
                        "p-4 rounded-3xl border-2 transition-all shadow-md flex items-center gap-3.5 border-b-4",
                        ambianceTheme === 'dark' ? "bg-slate-900/60 border-white/10 border-b-sky-950" : "bg-white border-slate-200 border-b-sky-600/30"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-400">Cezm/Med/Şedde (9-19)</div>
                            <div className="text-xl sm:text-2xl font-black text-sky-400">{stats.cezmMedCount}</div>
                        </div>
                    </div>

                    {/* 4. Tenvin & Kaideler (Adım 20 - 29) */}
                    <div className={cn(
                        "p-4 rounded-3xl border-2 transition-all shadow-md flex items-center gap-3.5 border-b-4",
                        ambianceTheme === 'dark' ? "bg-slate-900/60 border-white/10 border-b-amber-950" : "bg-white border-slate-200 border-b-amber-600/30"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-400">Tenvin/Kaideler (20-29)</div>
                            <div className="text-xl sm:text-2xl font-black text-amber-400">{stats.advancedCount}</div>
                        </div>
                    </div>

                    {/* 5. Kur'an-ı Kerim / Cüz (Adım 30) */}
                    <div className={cn(
                        "p-4 rounded-3xl border-2 transition-all shadow-md flex items-center gap-3.5 border-b-4 col-span-2 lg:col-span-1",
                        ambianceTheme === 'dark' ? "bg-slate-900/60 border-white/10 border-b-cyan-950" : "bg-white border-slate-200 border-b-cyan-600/30"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-400">Kur&apos;an / Cüz (30)</div>
                            <div className="text-xl sm:text-2xl font-black text-cyan-400">
                                {stats.quranCount} <span className="text-xs font-mono font-bold text-slate-400">({stats.quranPercent}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 3. ARAMA VE SEVİYE FİLTRELERİ */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className={cn(
                    "p-3 sm:p-4 rounded-3xl border-2 transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 print-hide",
                    ambianceTheme === 'dark' ? "bg-slate-900/40 border-white/10" : "bg-white border-slate-200"
                )}>
                    {/* Sol: İsim / No Arama Input */}
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Öğrenci adı veya okul no ile ara..."
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
                                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Orta: Seviye Filtre Butonları */}
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
                            📖 Kur&apos;an ({stats.quranCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('advanced')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                statusFilter === 'advanced'
                                    ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm"
                                    : ambianceTheme === 'dark' ? "bg-slate-950 border border-white/10 text-slate-400 hover:text-white" : "bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900"
                            )}
                        >
                            🌟 Tenvin &amp; Kaideler ({stats.advancedCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('cezm_med')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                statusFilter === 'cezm_med'
                                    ? "bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-sm"
                                    : ambianceTheme === 'dark' ? "bg-slate-950 border border-white/10 text-slate-400 hover:text-white" : "bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900"
                            )}
                        >
                            ⚡ Cezm/Med/Şedde ({stats.cezmMedCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('letters')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs",
                                statusFilter === 'letters'
                                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm"
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
                                    {/* Kart Üst Bilgisi: Avatar + İsim + No + Popover */}
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

                                            {/* Aşama Yönetimi Popover Tetikleyici (Diyanet 4 Bölüm) */}
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
                                                        title="30 Diyanet Adımını Doğrudan İşaretle"
                                                    >
                                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className={cn(
                                                    "w-80 p-3 rounded-2xl border shadow-2xl space-y-2",
                                                    ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
                                                )}>
                                                    <div className="pb-2 border-b border-white/10">
                                                        <h4 className="font-bold text-xs">{student.displayName}</h4>
                                                        <p className="text-[10px] text-slate-400">Diyanet basamaklarını doğrudan işaretleyin:</p>
                                                    </div>
                                                    <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                                        {DIYANET_SECTIONS.map(sec => {
                                                            const stagesInSec = DIYANET_ELIFBA_STAGES.filter(s => s.section === sec.id && s.category !== 'quran');
                                                            return (
                                                                <div key={sec.id} className="space-y-1">
                                                                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider px-1 pt-1">
                                                                        {sec.title}
                                                                    </div>
                                                                    {stagesInSec.map(stg => {
                                                                        const isComp = isDiyanetStageCompleted(prog?.stages, stg.id);
                                                                        const isInProg = prog?.stages[stg.id]?.status === 'in_progress';
                                                                        return (
                                                                            <div key={stg.id} className="flex items-center justify-between p-1.5 rounded-xl bg-white/5 text-xs">
                                                                                <span className="truncate max-w-[140px] font-medium text-[11px]">
                                                                                    {stg.shortTitle}
                                                                                </span>
                                                                                <div className="flex items-center gap-1">
                                                                                    <button
                                                                                        onClick={() => handleSetStageStatus(student, stg.id, 'completed')}
                                                                                        className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer", isComp ? "bg-emerald-500 text-white font-black" : "text-slate-400 hover:text-white")}
                                                                                        title="Tamamlandı"
                                                                                    >
                                                                                        ✓
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleSetStageStatus(student, stg.id, 'in_progress')}
                                                                                        className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer", isInProg ? "bg-amber-500 text-slate-950 font-black" : "text-slate-400 hover:text-white")}
                                                                                        title="Çalışıyor"
                                                                                    >
                                                                                        ⏳
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleSetStageStatus(student, stg.id, 'not_started')}
                                                                                        className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer", !isComp && !isInProg ? "bg-slate-700 text-white" : "text-slate-500 hover:text-white")}
                                                                                        title="Sıfırla"
                                                                                    >
                                                                                        -
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        {/* KART GÖVDESİ: DİYANET ADIMI VEYA CÜZ SAYFASI */}
                                        <div className={cn(
                                            "p-3 rounded-2xl border transition-all",
                                            cuzPage && cuzPage > 0
                                                ? ambianceTheme === 'dark' ? "bg-emerald-950/30 border-emerald-500/30" : "bg-emerald-50/70 border-emerald-300"
                                                : stageInfo.level === 'advanced'
                                                ? ambianceTheme === 'dark' ? "bg-amber-950/30 border-amber-500/30" : "bg-amber-50/70 border-amber-300"
                                                : stageInfo.level === 'cezm_med'
                                                ? ambianceTheme === 'dark' ? "bg-sky-950/30 border-sky-500/30" : "bg-sky-50/70 border-sky-300"
                                                : ambianceTheme === 'dark' ? "bg-teal-950/30 border-teal-500/30" : "bg-teal-50/70 border-teal-300"
                                        )}>
                                            <div className="flex items-center justify-between text-xs font-black mb-1">
                                                <span className="flex items-center gap-1.5">
                                                    {cuzPage && cuzPage > 0 ? (
                                                        <span className="text-emerald-400 flex items-center gap-1">
                                                            <BookOpen className="w-3.5 h-3.5" /> Kur&apos;an-ı Kerim
                                                        </span>
                                                    ) : (
                                                        <span className={cn(
                                                            "flex items-center gap-1",
                                                            stageInfo.level === 'advanced' ? "text-amber-400" :
                                                            stageInfo.level === 'cezm_med' ? "text-sky-400" : "text-teal-400"
                                                        )}>
                                                            <Award className="w-3.5 h-3.5" /> Diyanet Adım {stageInfo.stepNumber} / 30
                                                        </span>
                                                    )}
                                                </span>

                                                <span className="font-mono text-[10px] text-slate-400">
                                                    {stageInfo.completedCount} / 30 Adım
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
                                                    <div className="flex items-center justify-between text-xs font-bold">
                                                        <span className={cn(
                                                            "truncate max-w-[170px]",
                                                            ambianceTheme === 'dark' ? "text-white" : "text-slate-800"
                                                        )}>
                                                            {stageInfo.currentTitle}
                                                        </span>
                                                        <span className="font-mono text-[11px] text-emerald-400 font-black shrink-0">
                                                            %{stageInfo.percent}
                                                        </span>
                                                    </div>

                                                    {/* 30 Parçalı Mini Milestone Göstergesi */}
                                                    <div className="flex items-center gap-[2px] w-full pt-0.5">
                                                        {Array.from({ length: 30 }, (_, i) => i + 1).map(step => {
                                                            const isCompleted = step <= stageInfo.completedCount;
                                                            const isCurrent = step === stageInfo.stepNumber;
                                                            return (
                                                                <div
                                                                    key={step}
                                                                    className={cn(
                                                                        "h-1.5 flex-1 rounded-sm transition-all",
                                                                        isCompleted
                                                                            ? "bg-emerald-400"
                                                                            : isCurrent
                                                                            ? "bg-amber-400 animate-pulse"
                                                                            : "bg-white/10"
                                                                    )}
                                                                    title={`Adım ${step}`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Kart Alt Eylemleri: Doğrudan Canlı Test Butonu */}
                                    <div className="pt-3 mt-3 border-t border-white/5 flex items-center gap-2">
                                        <Button
                                            onClick={() => handleStartLiveTest(student, stageInfo.currentStageId)}
                                            className="flex-1 h-9 rounded-xl font-black text-xs transition-all shadow-md bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-950/40 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-white" />
                                            <span>Canlı Test Et</span>
                                        </Button>

                                        {/* Hızlı Cüz Sayfası Belirle */}
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
                                                    title="Kur'an-ı Kerim Sayfasını Belirle"
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    <span>{cuzPage && cuzPage > 0 ? `${cuzPage}p` : 'Cüz'}</span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className={cn(
                                                "w-52 p-3 rounded-2xl border shadow-xl space-y-2",
                                                ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
                                            )}>
                                                <span className="text-xs font-bold block">Kur&apos;an Sayfası Ata (1-604)</span>
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
                    /* 4.B KUŞBAKIŞI MATRİS TABLO GÖRÜNÜMÜ (30 DİYANET ADIMI) */
                    /* ──────────────────────────────────────────────────────────── */
                    <Card className={cn(
                        "rounded-3xl border-2 transition-all shadow-2xl overflow-hidden border-b-6",
                        ambianceTheme === 'dark'
                            ? "bg-[#0f172a]/95 border-white/10 border-b-cyan-950/60 shadow-black/60"
                            : "bg-white border-slate-200 border-b-cyan-600/30 shadow-slate-300/40"
                    )}>
                        {/* Matris Bölüm Filtre Sekmeleri */}
                        <div className="p-3 border-b border-white/10 flex items-center justify-between flex-wrap gap-2 bg-slate-950/40">
                            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs">
                                <button
                                    type="button"
                                    onClick={() => setMatrixSection('all')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer text-xs shrink-0",
                                        matrixSection === 'all'
                                            ? "bg-indigo-600 text-white shadow-sm"
                                            : "bg-white/5 text-slate-400 hover:text-white"
                                    )}
                                >
                                    Tüm 30 Adım
                                </button>
                                {DIYANET_SECTIONS.map(sec => (
                                    <button
                                        key={sec.id}
                                        type="button"
                                        onClick={() => setMatrixSection(sec.id)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs shrink-0",
                                            matrixSection === sec.id
                                                ? "bg-emerald-600 text-white shadow-sm"
                                                : "bg-white/5 text-slate-400 hover:text-white"
                                        )}
                                    >
                                        {sec.title}
                                    </button>
                                ))}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                                {matrixStages.length} Sütun Görüntüleniyor
                            </span>
                        </div>

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
                                            Öğrenci Adı &amp; No
                                        </th>

                                        {/* Kur'an / Cüz Sayfa Sütunu (Adım 30) */}
                                        <th className={cn(
                                            "sticky top-0 z-30 font-black text-xs px-3 py-3.5 border-b border-r text-center min-w-[130px]",
                                            ambianceTheme === 'dark'
                                                ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/20"
                                                : "bg-emerald-100/90 text-emerald-900 border-emerald-300"
                                        )}>
                                            📖 Adım 30: Kur&apos;an
                                        </th>

                                        {/* Diyanet Aşamaları Sütun Başlıkları */}
                                        {matrixStages.map((stage) => (
                                            <th
                                                key={stage.id}
                                                className={cn(
                                                    "sticky top-0 z-20 font-black text-[11px] px-2 py-3 border-b border-r text-center min-w-[90px] whitespace-nowrap",
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
                                        const stageInfo = getStudentStageInfo(student.uid);

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

                                                {/* Diyanet Aşama Hücreleri */}
                                                {matrixStages.map((stage) => {
                                                    const isComp = isDiyanetStageCompleted(prog?.stages, stage.id);
                                                    const isInProg = prog?.stages[stage.id]?.status === 'in_progress';
                                                    const score = prog?.stages[stage.id]?.score;

                                                    return (
                                                        <td key={stage.id} className={cn("text-center px-1 py-2 border-r", ambianceTheme === 'dark' ? "border-white/5" : "border-slate-200")}>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className={cn(
                                                                            "w-11 h-8 rounded-xl font-black text-xs transition-all border inline-flex flex-col items-center justify-center cursor-pointer shadow-sm",
                                                                            isComp
                                                                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-emerald-950/20"
                                                                                : isInProg
                                                                                ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 animate-pulse"
                                                                                : ambianceTheme === 'dark' ? "bg-slate-900/50 border-white/5 text-slate-600 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-800"
                                                                        )}
                                                                        title={`${stage.title} durumunu değiştir`}
                                                                    >
                                                                        {isComp ? (
                                                                            <>
                                                                                <span className="text-[11px] font-black leading-none">✓</span>
                                                                                {score !== undefined && <span className="text-[8px] font-mono leading-none opacity-80 mt-0.5">%{score}</span>}
                                                                            </>
                                                                        ) : isInProg ? (
                                                                            <span className="text-[10px]">⏳</span>
                                                                        ) : (
                                                                            <span className="text-slate-600 text-xs">-</span>
                                                                        )}
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className={cn(
                                                                    "w-56 p-3 rounded-2xl border shadow-xl space-y-2",
                                                                    ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
                                                                )}>
                                                                    <div className="border-b border-white/10 pb-1.5">
                                                                        <span className="text-xs font-bold block">{stage.title}</span>
                                                                        <span className="text-[10px] text-slate-400">{student.displayName}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-1 pt-1">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'completed')}
                                                                            className="h-8 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg"
                                                                        >
                                                                            ✓ Geçti
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'in_progress')}
                                                                            className="h-8 text-[11px] bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg"
                                                                        >
                                                                            ⏳ Çalışıyor
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'not_started')}
                                                                            className="h-8 text-[11px] border-white/10 rounded-lg text-slate-400 hover:text-white"
                                                                        >
                                                                            Sıfırla
                                                                        </Button>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleStartLiveTest(student, stage.id)}
                                                                        className="w-full h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg mt-1"
                                                                    >
                                                                        <Play className="w-3 h-3 mr-1 fill-white" /> Canlı Test Başlat
                                                                    </Button>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </td>
                                                    );
                                                })}

                                                {/* Hızlı Aksiyon Sütunu */}
                                                <td className="text-center px-3 py-2 print-hide">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleStartLiveTest(student, stageInfo.currentStageId)}
                                                        className="h-8 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md cursor-pointer"
                                                    >
                                                        <Play className="w-3 h-3 mr-1 fill-white" /> Sına
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
            {/* 5. CANLI KUR'AN / ELİFBA TEST MODALI (30 ADIM DİYANET ENTEGRASYONU) */}
            {/* ──────────────────────────────────────────────────────────── */}
            <LiveQuranTester
                isOpen={isLiveTestOpen}
                onClose={() => setIsLiveTestOpen(false)}
                student={testingStudent}
                allStudents={students}
                onSelectStudent={(s) => setTestingStudent(s)}
                currentProgress={testingStudent ? progressMap[testingStudent.uid] : undefined}
                initialStageId={testingStageId}
                classId={selectedClassId}
                className={className}
                branch={selectedBranch}
                onProgressSaved={loadTrackerData}
            />

        </div>
    );
}
