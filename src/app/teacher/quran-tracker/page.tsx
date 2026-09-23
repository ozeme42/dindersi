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
    Filter,
    Trash2,
    RotateCcw,
    FilePlus2,
    Image as ImageIcon,
    FileText,
    Eye,
    HelpCircle,
    XCircle,
    Save
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
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
    isDiyanetStageCompleted,
    LEGACY_STAGE_ALIASES,
    CUZ1_LETTER_META,
    getStageItemMeta
} from '@/lib/elifba-curriculum';
import {
    getQuranTrackerData,
    saveStudentQuranProgress,
    batchUpdateQuranStage,
    getCustomQuranBookPages,
    saveCustomQuranBookPage,
    deleteCustomQuranBookPage,
    resetCustomQuranBookPages,
    type QuranStudentProgress
} from './actions';
import { LiveQuranTester } from './live-quran-tester';
import { BookReadingTester } from './book-reading-tester';
import { StudentLetterReportDialog } from './student-letter-report-dialog';
import {
    KURAN_BOOK_PAGES,
    TILAVET_RUBRIC_CRITERIA,
    getPagesByGrade,
    getPageById,
    calculateRubricScore,
    getTilavetGradeBadge,
    type KuranBookPage,
    type KuranPageAyah
} from '@/lib/kuran-ders-kitabi-data';
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

    // Görünüm & Tema Modları (Varsayılan olarak Açık, Ferah ve Canlı Renkli)
    const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
    const [ambianceTheme, setAmbianceTheme] = useState<'dark' | 'light'>(() => {
        if (typeof window === 'undefined') return 'light';
        try {
            return (localStorage.getItem('quran-tracker-ambiance') as 'dark' | 'light') || 'light';
        } catch {
            return 'light';
        }
    });

    const toggleAmbianceTheme = useCallback(() => {
        setAmbianceTheme(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem('quran-tracker-ambiance', next);
            } catch {}
            return next;
        });
    }, []);

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

    // MEB Kur'an Ders Kitabı Okuma Sayfaları Modülü State
    const [activeModule, setActiveModule] = useState<'elifba' | 'book_readings'>('elifba');
    const [isBookTesterOpen, setIsBookTesterOpen] = useState<boolean>(false);
    const [testingBookStudent, setTestingBookStudent] = useState<UserProfile | null>(null);
    const [testingBookPageId, setTestingBookPageId] = useState<string>('p5-1');
    const [selectedBookGrade, setSelectedBookGrade] = useState<number>(5);

    // Dinamik Ders Kitabı Okuma Sayfaları (Firestore Kayıtlı Liste)
    const [bookPages, setBookPages] = useState<KuranBookPage[]>(KURAN_BOOK_PAGES);
    const [isLoadingBookPages, setIsLoadingBookPages] = useState<boolean>(true);

    // Sayfa Ekleme / Düzenleme Dialog State'leri
    const [isPageDialogOpen, setIsPageDialogOpen] = useState<boolean>(false);
    const [editingPageId, setEditingPageId] = useState<string | null>(null); // null => yeni sayfa ekleme
    const [formGrade, setFormGrade] = useState<5 | 6 | 7 | 8>(5);
    const [formPageNumber, setFormPageNumber] = useState<number>(1);
    const [formTitle, setFormTitle] = useState<string>('');
    const [formSurahInfo, setFormSurahInfo] = useState<string>('');
    const [formDescription, setFormDescription] = useState<string>('');
    const [formImageSrc, setFormImageSrc] = useState<string>('');
    const [formArabicPreview, setFormArabicPreview] = useState<string>('');
    const [formAyahs, setFormAyahs] = useState<KuranPageAyah[]>([]);
    const [isSavingPage, setIsSavingPage] = useState<boolean>(false);

    // Sayfa Silme Onay Dialog State'i
    const [pageToDelete, setPageToDelete] = useState<KuranBookPage | null>(null);
    const [isDeletingPage, setIsDeletingPage] = useState<boolean>(false);

    // Seçili Sınıfın Sayfaları (Dinamik)
    const currentGradePages = useMemo(() => {
        return bookPages.filter(p => p.grade === selectedBookGrade).sort((a, b) => a.pageNumber - b.pageNumber);
    }, [bookPages, selectedBookGrade]);

    // 0. Firestore'daki Özel / Düzenlenmiş MEB Okuma Sayfalarını Yükle
    const loadBookPages = useCallback(async () => {
        setIsLoadingBookPages(true);
        try {
            const pages = await getCustomQuranBookPages();
            setBookPages(pages);
        } catch (err) {
            console.error("Kitap sayfaları yüklenemedi:", err);
        } finally {
            setIsLoadingBookPages(false);
        }
    }, []);

    useEffect(() => {
        loadBookPages();
    }, [loadBookPages]);

    // 1. Sınıfları Yükle
    useEffect(() => {
        const fetchClasses = async () => {
            setIsLoadingClasses(true);
            try {
                const snap = await getDocs(query(collection(db, 'classes'), orderBy('name')));
                const cls = snap.docs.map(d => ({ id: d.id, ...d.data() }) as SchoolClass);
                setAllClasses(cls);

                // Sınıf ve şube ilk başta seçili gelmeyecek; öğretmen kendisi seçecek
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
        if (!selectedClassId || !selectedBranch) {
            setStudents([]);
            setProgressMap({});
            setClassName('');
            return;
        }
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
                const prevStage = current.stages?.[resolvedId] || {};
                return {
                    ...prev,
                    [student.uid]: {
                        ...current,
                        stages: {
                            ...current.stages,
                            [resolvedId]: {
                                ...prevStage,
                                status: newStatus,
                                completedAt: newStatus === 'completed' ? (prevStage.completedAt || new Date().toISOString()) : undefined,
                                score: newStatus === 'completed' ? (prevStage.score ?? 100) : undefined
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

    // Harf Değerlendirme Karnesi / Rapor Modalı State'leri
    const [reportStudent, setReportStudent] = useState<UserProfile | null>(null);
    const [reportStageId, setReportStageId] = useState<string>('cuz1');
    const [isReportOpen, setIsReportOpen] = useState(false);

    const handleOpenLetterReport = (student: UserProfile, stageId?: string) => {
        setReportStudent(student);
        const resolved = stageId ? mapLegacyStageIdToDiyanet(stageId) : 'cuz1';
        setReportStageId(resolved);
        setIsReportOpen(true);
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

    // Canlı Test Modunu Başlat (Öğrencinin kaldığı aşamadan devam eder)
    const handleStartLiveTest = (student: UserProfile, stageId?: string) => {
        const info = getStudentStageInfo(student.uid);
        let targetStageId = stageId;
        if (!targetStageId) {
            targetStageId = info.currentStageId;
        }
        const resolvedId = mapLegacyStageIdToDiyanet(targetStageId);
        setTestingStudent(student);
        setTestingStageId(resolvedId);
        setIsLiveTestOpen(true);
    };

    // Sınıf adına göre otomatik kitap seviyesi belirleme (örn: 5-A ise 5. sınıf)
    useEffect(() => {
        if (className) {
            const match = className.match(/^([5-8])/);
            if (match) {
                const gr = parseInt(match[1], 10);
                setSelectedBookGrade(gr);
                const pages = bookPages.filter(p => p.grade === gr).sort((a, b) => a.pageNumber - b.pageNumber);
                if (pages.length > 0) {
                    setTestingBookPageId(pages[0].id);
                }
            }
        }
    }, [className, bookPages]);

    // MEB Kitap Okuma Canlı Testini Başlat (Öğrencinin kaldığı sayfadan devam eder)
    const handleOpenBookTester = (pageId?: string, student?: UserProfile) => {
        const activeStudent = student || (filteredStudents.length > 0 ? filteredStudents[0] : students[0]);
        if (activeStudent) {
            setTestingBookStudent(activeStudent);
        }

        let targetPageId = pageId;
        if (!targetPageId && activeStudent) {
            const prog = progressMap[activeStudent.uid];
            const readings = prog?.bookReadings || {};
            const pages = bookPages.filter(p => p.grade === selectedBookGrade).sort((a, b) => a.pageNumber - b.pageNumber);
            const inProgressPage = pages.find(p => readings[p.id]?.status === 'in_progress');
            const unreadPage = pages.find(p => !readings[p.id] || readings[p.id]?.status === 'needs_practice');
            const target = inProgressPage || unreadPage || pages[0];
            targetPageId = target?.id || 'p5-1';
        }

        if (targetPageId) {
            setTestingBookPageId(targetPageId);
        }
        setIsBookTesterOpen(true);
    };

    // Yeni Okuma Sayfası Ekleme Dialogunu Aç
    const handleOpenAddPage = (grade?: number) => {
        const targetGrade = (grade || selectedBookGrade || 5) as 5 | 6 | 7 | 8;
        const existingInGrade = bookPages.filter(p => p.grade === targetGrade);
        const nextNum = existingInGrade.length > 0 
            ? Math.max(...existingInGrade.map(p => p.pageNumber)) + 1 
            : 1;

        setEditingPageId(null);
        setFormGrade(targetGrade);
        setFormPageNumber(nextNum);
        setFormTitle(`${targetGrade}. Sınıf Okuma Sayfası ${nextNum}`);
        setFormSurahInfo('');
        setFormDescription(`${targetGrade}. Sınıf MEB Kur'an Ders Kitabı Sayfa ${nextNum}`);
        setFormImageSrc(`/kuran/${targetGrade}/sayfa${nextNum}.jpg`);
        setFormArabicPreview('');
        setFormAyahs([]);
        setIsPageDialogOpen(true);
    };

    // Mevcut Okuma Sayfasını Düzenleme Dialogunu Aç
    const handleOpenEditPage = (page: KuranBookPage) => {
        setEditingPageId(page.id);
        setFormGrade(page.grade as 5 | 6 | 7 | 8);
        setFormPageNumber(page.pageNumber);
        setFormTitle(page.title);
        setFormSurahInfo(page.surahInfo || '');
        setFormDescription(page.description || '');
        setFormImageSrc(page.imageSrc || '');
        setFormArabicPreview(page.arabicPreview || '');
        setFormAyahs(page.ayahs ? [...page.ayahs] : []);
        setIsPageDialogOpen(true);
    };

    // Arapça Metni Âyetlere Otomatik Böl
    const handleAutoSplitAyahs = () => {
        if (!formArabicPreview.trim()) {
            toast({ title: "Uyarı", description: "Lütfen önce Arapça metin alanına âyetleri yapıştırın.", variant: "destructive" });
            return;
        }
        const raw = formArabicPreview.trim();
        const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);
        const newAyahs: KuranPageAyah[] = [];

        if (lines.length > 1) {
            lines.forEach((line, idx) => {
                newAyahs.push({
                    number: idx + 1,
                    arabic: line,
                    surahName: formSurahInfo.split(' ')[0] || undefined
                });
            });
        } else {
            // Âyet numaralandırıcı sembollerle veya parantezlerle böl
            const chunks = raw.split(/(?<=[\u06DD\uFD3E\uFD3F\u06D6-\u06ED]|\([0-9٠-٩]+\)|﴿[0-9٠-٩]+﴾)/u).map(s => s.trim()).filter(Boolean);
            if (chunks.length > 1) {
                chunks.forEach((chunk, idx) => {
                    newAyahs.push({
                        number: idx + 1,
                        arabic: chunk,
                        surahName: formSurahInfo.split(' ')[0] || undefined
                    });
                });
            } else {
                newAyahs.push({
                    number: 1,
                    arabic: raw,
                    surahName: formSurahInfo.split(' ')[0] || undefined
                });
            }
        }

        setFormAyahs(newAyahs);
        toast({ title: "Âyetler Ayrıştırıldı", description: `${newAyahs.length} adet okuma bölümü / âyet oluşturuldu.` });
    };

    // Tekil Âyet Ekle / Güncelle / Sil
    const handleAddEmptyAyah = () => {
        setFormAyahs(prev => [
            ...prev,
            {
                number: prev.length + 1,
                arabic: '',
                surahName: formSurahInfo.split(' ')[0] || undefined
            }
        ]);
    };

    const handleUpdateAyahText = (index: number, text: string) => {
        setFormAyahs(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], arabic: text };
            return copy;
        });
    };

    const handleRemoveAyah = (index: number) => {
        setFormAyahs(prev => {
            const filtered = prev.filter((_, i) => i !== index);
            return filtered.map((a, i) => ({ ...a, number: i + 1 }));
        });
    };

    // Sayfayı Kaydet
    const handleSavePage = async () => {
        if (!formTitle.trim()) {
            toast({ title: "Eksik Alan", description: "Lütfen sayfa başlığını giriniz.", variant: "destructive" });
            return;
        }
        setIsSavingPage(true);
        try {
            const pageId = editingPageId || `p${formGrade}-${formPageNumber}-${Date.now().toString(36)}`;
            const pageObj: KuranBookPage = {
                id: pageId,
                grade: formGrade,
                pageNumber: Number(formPageNumber) || 1,
                title: formTitle.trim(),
                surahInfo: formSurahInfo.trim() || `${formGrade}. Sınıf MEB`,
                description: formDescription.trim() || `${formGrade}. Sınıf MEB Ders Kitabı Sayfa ${formPageNumber}`,
                imageSrc: formImageSrc.trim() || `/kuran/${formGrade}/sayfa${formPageNumber}.jpg`,
                arabicPreview: formArabicPreview.trim() || undefined,
                ayahs: formAyahs.length > 0 ? formAyahs : undefined
            };

            const res = await saveCustomQuranBookPage(pageObj);
            if (res.success) {
                toast({ title: "Başarılı", description: "Okuma sayfası başarıyla kaydedildi." });
                setIsPageDialogOpen(false);
                await loadBookPages();
            } else {
                toast({ title: "Hata", description: res.error || "Sayfa kaydedilemedi.", variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Hata", description: e?.message || "Sayfa kaydedilirken sorun oluştu.", variant: "destructive" });
        } finally {
            setIsSavingPage(false);
        }
    };

    // Sayfayı Sil Onayı
    const handleConfirmDeletePage = async () => {
        if (!pageToDelete) return;
        setIsDeletingPage(true);
        try {
            const res = await deleteCustomQuranBookPage(pageToDelete.id);
            if (res.success) {
                toast({ title: "Silindi", description: `Sayfa ${pageToDelete.pageNumber} (${pageToDelete.title}) kaldırıldı.` });
                setPageToDelete(null);
                await loadBookPages();
            } else {
                toast({ title: "Hata", description: res.error || "Sayfa silinemedi.", variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Hata", description: e?.message || "Sayfa silinemedi.", variant: "destructive" });
        } finally {
            setIsDeletingPage(false);
        }
    };

    // Tüm Sayfaları Varsayılana Sıfırla
    const handleResetPagesToDefault = async () => {
        if (!window.confirm("Tüm MEB ders kitabı sayfaları varsayılana sıfırlansın mı? Eklediğiniz özel sayfalar kaldırılacaktır.")) return;
        setIsLoadingBookPages(true);
        try {
            const res = await resetCustomQuranBookPages();
            if (res.success) {
                toast({ title: "Sıfırlandı", description: "Ders kitabı sayfaları MEB varsayılanlarına döndürüldü." });
                await loadBookPages();
            } else {
                toast({ title: "Hata", description: res.error, variant: "destructive" });
            }
        } catch (e: any) {
            toast({ title: "Hata", description: e?.message, variant: "destructive" });
        } finally {
            setIsLoadingBookPages(false);
        }
    };

    // MEB Ders Kitabı İstatistikleri (Seçili Sınıf İçin)
    const bookStats = useMemo(() => {
        const pagesForGrade = currentGradePages;
        const totalStudents = students.length;
        let studentsWithReadings = 0;
        let totalScoreSum = 0;
        let totalAssessments = 0;

        students.forEach(s => {
            const prog = progressMap[s.uid];
            const readings = prog?.bookReadings || {};
            let studentHasGradeReading = false;

            pagesForGrade.forEach(p => {
                const rec = readings[p.id];
                if (rec && rec.score !== undefined) {
                    totalScoreSum += rec.score;
                    totalAssessments++;
                    studentHasGradeReading = true;
                }
            });

            if (studentHasGradeReading) {
                studentsWithReadings++;
            }
        });

        const averageScore = totalAssessments > 0 ? Math.round(totalScoreSum / totalAssessments) : 0;
        const completionPercent = totalStudents > 0 ? Math.round((studentsWithReadings / totalStudents) * 100) : 0;

        return {
            pagesCount: pagesForGrade.length,
            totalStudents,
            studentsWithReadings,
            averageScore,
            totalAssessments,
            completionPercent
        };
    }, [students, progressMap, currentGradePages]);

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

        // 1. Öğrencinin aktif olarak devam ettiği (in_progress) ve HENÜZ GEÇMEDİĞİ bir aşama var mı?
        const inProgressNotCompleted = DIYANET_ELIFBA_STAGES.find(s => {
            if (s.category === 'quran') return false;
            // Zaten geçilmiş / tamamlanmışsa in_progress olamaz
            if (isDiyanetStageCompleted(prog.stages, s.id)) return false;

            const stageData = prog.stages?.[s.id];
            if (stageData?.status === 'in_progress') return true;
            for (const [legacyId, mappedId] of Object.entries(LEGACY_STAGE_ALIASES)) {
                if (mappedId === s.id && prog.stages?.[legacyId]?.status === 'in_progress') {
                    return true;
                }
            }
            return false;
        });

        // 2. Sıradaki henüz geçilmemiş İLK Diyanet aşaması (Öğrencinin geçmediği ilk adım)
        const firstUncompletedStage = DIYANET_ELIFBA_STAGES.find(s => {
            if (s.category === 'quran') return false;
            return !isDiyanetStageCompleted(prog.stages, s.id);
        });

        if (inProgressNotCompleted) {
            activeStep = inProgressNotCompleted.stepNumber;
        } else if (firstUncompletedStage) {
            activeStep = firstUncompletedStage.stepNumber;
        } else if (highestCompletedStep > 0) {
            // Tüm aşamalar geçildiyse en son adımdan bir sonrakine geç (en fazla 30)
            activeStep = Math.min(30, highestCompletedStep + 1);
        } else if (prog.currentStageId) {
            activeStep = getDiyanetStepNumber(prog.currentStageId, prog.cuzPage);
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
            ambianceTheme === 'dark'
                ? "bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-slate-100"
                : "bg-[#f8fafc] text-slate-900"
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

            {/* Sadece Karanlık Modda Canlı Glow Efektleri */}
            {ambianceTheme === 'dark' && (
                <div className="fixed inset-0 pointer-events-none z-0 print-hide overflow-hidden">
                    <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full blur-[160px] bg-violet-600/20" />
                    <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[140px] bg-pink-600/15" />
                    <div className="absolute bottom-[-15%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[150px] bg-cyan-600/15" />
                    <div className="absolute bottom-[0%] left-[-5%] w-[600px] h-[600px] rounded-full blur-[140px] bg-emerald-600/10" />
                    <div className="absolute top-[40%] left-[35%] w-[500px] h-[500px] rounded-full blur-[130px] bg-indigo-500/10" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-[size:28px_28px] opacity-30 pointer-events-none" />
                </div>
            )}

            <div className="max-w-[1750px] mx-auto p-3 sm:p-6 md:p-8 relative z-10 space-y-6">

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 1. ÜST GEZİNME, BAŞLIK VE KONTROLLER */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className={cn(
                    "p-4 sm:p-5 rounded-3xl border transition-all shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-4 print-hide",
                    ambianceTheme === 'dark'
                        ? "bg-white/6 border-white/12 border-b-violet-700/40 shadow-black/50 ring-1 ring-white/5 backdrop-blur-2xl"
                        : "bg-white border-slate-200 border-b-violet-500 shadow-sm"
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

                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/40 shrink-0 border border-white/30">
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
                                <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-[11px] px-2.5 py-0.5 shadow-sm border-0">
                                    Sanal Öğrenciler
                                </Badge>
                                {className && (
                                    <Badge variant="outline" className={cn(
                                        "font-mono font-bold text-xs",
                                        ambianceTheme === 'dark' ? "border-emerald-500/40 text-emerald-400" : "border-emerald-500 text-emerald-700 bg-emerald-50"
                                    )}>
                                        {className}
                                    </Badge>
                                )}
                            </div>
                            <p className={cn("text-xs sm:text-sm mt-0.5", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                Diyanet İşleri Başkanlığı Elifba basamakları ile sanal öğrencilerin adım adım canlı sözlü test ve gelişim takibi
                            </p>
                        </div>
                    </div>

                    {/* Sağ: Sınıf / Şube Seçicileri + Görünüm Modu + Yazdır */}
                    <div className="flex items-center flex-wrap gap-2.5">
                        
                        {/* Sınıf Seçici */}
                        <Select
                            value={selectedClassId || undefined}
                            onValueChange={(val) => {
                                setSelectedClassId(val);
                                const cls = allClasses.find(c => c.id === val);
                                if (cls && cls.branches && cls.branches.length > 0) {
                                    setSelectedBranch('');
                                } else {
                                    setSelectedBranch('all');
                                }
                            }}
                            disabled={isLoadingClasses}
                        >
                            <SelectTrigger className={cn(
                                "w-[150px] sm:w-[170px] h-10 rounded-2xl font-bold text-xs border transition-all",
                                ambianceTheme === 'dark'
                                    ? "bg-white/8 border-white/15 text-white backdrop-blur-sm"
                                    : "bg-white border-slate-300 text-slate-900"
                            )}>
                                <SelectValue placeholder="Sınıf Seçiniz" />
                            </SelectTrigger>
                            <SelectContent className={ambianceTheme === 'dark'
                                ? "bg-indigo-950 border-white/15 text-white"
                                : "bg-white border-slate-200 text-slate-900 shadow-xl"
                            }>
                                {allClasses.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="font-semibold text-xs cursor-pointer">
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Şube Seçici */}
                        {currentClass && currentClass.branches && currentClass.branches.length > 0 && (
                            <Select value={selectedBranch || undefined} onValueChange={setSelectedBranch}>
                                <SelectTrigger className={cn(
                                    "w-[130px] sm:w-[150px] h-10 rounded-2xl font-bold text-xs border transition-all",
                                    ambianceTheme === 'dark'
                                        ? "bg-white/8 border-white/15 text-white backdrop-blur-sm"
                                        : "bg-white border-slate-300 text-slate-900"
                                )}>
                                    <SelectValue placeholder="Şube Seçiniz" />
                                </SelectTrigger>
                                <SelectContent className={ambianceTheme === 'dark'
                                    ? "bg-indigo-950 border-white/15 text-white"
                                    : "bg-white border-slate-200 text-slate-900 shadow-xl"
                                }>
                                    <SelectItem value="all" className="font-semibold text-xs cursor-pointer">Tüm Şubeler</SelectItem>
                                    {currentClass.branches.map(b => (
                                        <SelectItem key={b} value={b} className="font-semibold text-xs cursor-pointer">
                                            {b} Şubesi
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        {/* Görünüm Modu Değiştirici: Kartlar vs Matris */}
                        <div className={cn(
                            "flex items-center p-1 rounded-2xl border transition-all",
                            ambianceTheme === 'dark' ? "bg-white/6 border-white/12" : "bg-slate-100 border-slate-300"
                        )}>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    viewMode === 'cards'
                                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/40"
                                        : ambianceTheme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
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
                                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40"
                                        : ambianceTheme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
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
                            onClick={toggleAmbianceTheme}
                            className={cn(
                                "h-10 w-10 rounded-2xl border transition-all cursor-pointer",
                                ambianceTheme === 'dark'
                                    ? "bg-white/6 border-white/12 text-amber-300 hover:bg-white/12 hover:border-amber-400/40"
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
                                    ? "bg-white/6 border-white/12 text-slate-300 hover:text-white hover:bg-white/12"
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
                {/* MODÜL GEÇİŞ SEKMELERİ: ELİFBA & DİYANET vs MEB DERS KİTABI */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print-hide">
                    <div className={cn(
                        "flex items-center p-1.5 rounded-2xl border transition-all shadow-xl gap-2",
                        ambianceTheme === 'dark' ? "bg-white/6 border-white/12 backdrop-blur-xl" : "bg-white border-slate-200 shadow-sm"
                    )}>
                        <button
                            type="button"
                            onClick={() => setActiveModule('elifba')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer",
                                activeModule === 'elifba'
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/40 ring-1 ring-white/20"
                                    : ambianceTheme === 'dark' ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                        >
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            <span>Elifba &amp; Diyanet Takibi (30 Adım)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveModule('book_readings')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer",
                                activeModule === 'book_readings'
                                    ? "bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/40 ring-1 ring-white/20"
                                    : ambianceTheme === 'dark' ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                        >
                            <BookOpen className="w-4 h-4 text-purple-400" />
                            <span>Ders Kitabı Okuma Sayfaları (MEB)</span>
                            <Badge className={cn(
                                "font-mono text-[10px] px-1.5 py-0",
                                ambianceTheme === 'dark' ? "bg-amber-400/20 text-amber-300 border-amber-400/40" : "bg-amber-100 text-amber-800 border-amber-200"
                            )}>
                                10 Kriterli Rubrik
                            </Badge>
                        </button>
                    </div>

                    {/* Hızlı Bilgi Rozeti */}
                    <div className={cn("hidden lg:flex items-center gap-2 text-xs font-semibold", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                        {activeModule === 'elifba' ? (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                30 basamaklı Diyanet müfredatı üzerinden harf, tecvid ve cüz takibi
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-400" />
                                5, 6, 7 ve 8. Sınıf Kur&apos;an ders kitabı okuma sayfaları &amp; akıllı tahta tilavet sınavı
                            </span>
                        )}
                    </div>
                </div>

                {activeModule === 'elifba' ? (
                    <>
                        {/* ──────────────────────────────────────────────────────────── */}
                        {/* 2. DİYANET 30 ADIM İSTATİSTİK ŞERİDİ */}
                        {/* ──────────────────────────────────────────────────────────── */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 print-hide">
                    {/* 1. Toplam Öğrenci */}
                    <div className={cn(
                        "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5",
                        ambianceTheme === 'dark'
                            ? "border-white/15 bg-gradient-to-br from-violet-600/25 via-purple-600/15 to-violet-900/20 ring-1 ring-violet-500/20 backdrop-blur-sm"
                            : "border-slate-200 bg-white shadow-sm ring-1 ring-slate-100"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/40">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-violet-300" : "text-violet-700")}>Toplam Öğrenci</div>
                            <div className={cn("text-xl sm:text-2xl font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>{stats.total}</div>
                        </div>
                    </div>

                    {/* 2. Harfler & Harekeler (Adım 1 - 8) */}
                    <div className={cn(
                        "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5",
                        ambianceTheme === 'dark'
                            ? "border-white/15 bg-gradient-to-br from-emerald-600/25 via-teal-600/15 to-emerald-900/20 ring-1 ring-emerald-500/20 backdrop-blur-sm"
                            : "border-slate-200 bg-white shadow-sm ring-1 ring-slate-100"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/40">
                            <Award className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-emerald-300" : "text-emerald-700")}>Harf &amp; Harekeler (1-8)</div>
                            <div className={cn("text-xl sm:text-2xl font-black", ambianceTheme === 'dark' ? "text-emerald-100" : "text-slate-900")}>{stats.lettersCount}</div>
                        </div>
                    </div>

                    {/* 3. Cezm, Med & Şedde (Adım 9 - 19) */}
                    <div className={cn(
                        "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5",
                        ambianceTheme === 'dark'
                            ? "border-white/15 bg-gradient-to-br from-sky-600/25 via-blue-600/15 to-sky-900/20 ring-1 ring-sky-500/20 backdrop-blur-sm"
                            : "border-slate-200 bg-white shadow-sm ring-1 ring-slate-100"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/40">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-sky-300" : "text-sky-700")}>Cezm/Med/Şedde (9-19)</div>
                            <div className={cn("text-xl sm:text-2xl font-black", ambianceTheme === 'dark' ? "text-sky-100" : "text-slate-900")}>{stats.cezmMedCount}</div>
                        </div>
                    </div>

                    {/* 4. Tenvin & Kaideler (Adım 20 - 29) */}
                    <div className={cn(
                        "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5",
                        ambianceTheme === 'dark'
                            ? "border-white/15 bg-gradient-to-br from-amber-600/25 via-orange-600/15 to-amber-900/20 ring-1 ring-amber-500/20 backdrop-blur-sm"
                            : "border-slate-200 bg-white shadow-sm ring-1 ring-slate-100"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/40">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-amber-300" : "text-amber-700")}>Tenvin/Kaideler (20-29)</div>
                            <div className={cn("text-xl sm:text-2xl font-black", ambianceTheme === 'dark' ? "text-amber-100" : "text-slate-900")}>{stats.advancedCount}</div>
                        </div>
                    </div>

                    {/* 5. Kur'an-ı Kerim / Cüz (Adım 30) */}
                    <div className={cn(
                        "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5 col-span-2 lg:col-span-1",
                        ambianceTheme === 'dark'
                            ? "border-white/15 bg-gradient-to-br from-cyan-600/25 via-teal-600/15 to-cyan-900/20 ring-1 ring-cyan-500/20 backdrop-blur-sm"
                            : "border-slate-200 bg-white shadow-sm ring-1 ring-slate-100"
                    )}>
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/40">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-cyan-300" : "text-cyan-700")}>Kur&apos;an / Cüz (30)</div>
                            <div className={cn("text-xl sm:text-2xl font-black", ambianceTheme === 'dark' ? "text-cyan-100" : "text-slate-900")}>
                                {stats.quranCount} <span className={cn("text-xs font-mono font-bold", ambianceTheme === 'dark' ? "text-cyan-400" : "text-cyan-600")}>({stats.quranPercent}%)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 3. ARAMA VE SEVİYE FİLTRELERİ */}
                {/* ──────────────────────────────────────────────────────────── */}
                <div className={cn(
                    "p-3 sm:p-4 rounded-3xl border transition-all shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 print-hide",
                    ambianceTheme === 'dark'
                        ? "bg-white/5 border-white/10 ring-1 ring-white/5 backdrop-blur-sm"
                        : "bg-white border-slate-200 shadow-sm"
                )}>
                    {/* Sol: İsim / No Arama Input */}
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-violet-500" />
                            <Input
                                placeholder="Öğrenci adı veya okul no ile ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={cn(
                                    "h-9 pl-9 pr-8 text-xs rounded-xl font-medium border",
                                    ambianceTheme === 'dark'
                                        ? "bg-white/8 border-white/15 text-white placeholder:text-slate-400"
                                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                                )}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Orta: Seviye Filtre Butonları */}
                    <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar text-xs">
                        {([
                            { val: 'all', label: `Tümü (${stats.total})`, active: 'bg-gradient-to-r from-violet-600 to-indigo-600' },
                            { val: 'quran', label: `📖 Kur'an (${stats.quranCount})`, active: 'bg-gradient-to-r from-cyan-600 to-teal-600' },
                            { val: 'advanced', label: `🌟 Tenvin (${stats.advancedCount})`, active: 'bg-gradient-to-r from-amber-600 to-orange-600' },
                            { val: 'cezm_med', label: `⚡ Cezm/Med (${stats.cezmMedCount})`, active: 'bg-gradient-to-r from-sky-600 to-blue-600' },
                            { val: 'letters', label: `🔤 Harfler (${stats.lettersCount})`, active: 'bg-gradient-to-r from-emerald-600 to-teal-600' },
                        ] as { val: typeof statusFilter; label: string; active: string }[]).map(f => (
                            <button
                                key={f.val}
                                type="button"
                                onClick={() => setStatusFilter(f.val)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs border",
                                    statusFilter === f.val
                                        ? f.active + " text-white shadow-md border-transparent"
                                        : ambianceTheme === 'dark'
                                            ? "bg-white/6 border-white/10 text-slate-400 hover:text-white hover:bg-white/12"
                                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Sağ: Lejant Rozetleri */}
                    <div className={cn("hidden xl:flex items-center gap-3 text-xs font-semibold", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> Tamamlandı</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shadow-sm" /> Çalışıyor</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Bekliyor</span>
                    </div>
                </div>

                {/* ──────────────────────────────────────────────────────────── */}
                {/* 4. GÖRÜNÜM ALANI (KARTLAR VEYA MATRİS) */}
                {/* ──────────────────────────────────────────────────────────── */}
                {isLoadingData ? (
                    <div className="flex flex-col items-center justify-center py-28 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-violet-400" />
                        <span className="text-sm text-slate-400 font-bold">Öğrenci okuma kayıtları yükleniyor...</span>
                    </div>
                ) : !selectedClassId ? (
                    <div className={cn(
                        "text-center py-20 px-6 rounded-3xl border max-w-xl mx-auto shadow-xl my-6",
                        ambianceTheme === 'dark' ? "border-white/10 bg-white/5 text-white backdrop-blur-xl" : "border-slate-200 bg-white text-slate-900 shadow-sm"
                    )}>
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
                            <GraduationCap className="w-8 h-8" />
                        </div>
                        <h3 className={cn("text-xl font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                            Lütfen Bir Sınıf Seçiniz
                        </h3>
                        <p className={cn("text-sm mt-2 leading-relaxed max-w-md mx-auto", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                            Kur&apos;an-ı Kerim ve Elifba takip kayıtlarını görüntülemek için lütfen yukarıdaki menüden bir sınıf seçiniz.
                        </p>
                    </div>
                ) : !selectedBranch ? (
                    <div className={cn(
                        "text-center py-20 px-6 rounded-3xl border max-w-xl mx-auto shadow-xl my-6",
                        ambianceTheme === 'dark' ? "border-white/10 bg-white/5 text-white backdrop-blur-xl" : "border-slate-200 bg-white text-slate-900 shadow-sm"
                    )}>
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                            <Users className="w-8 h-8" />
                        </div>
                        <h3 className={cn("text-xl font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                            Lütfen Bir Şube Seçiniz
                        </h3>
                        <p className={cn("text-sm mt-2 leading-relaxed max-w-md mx-auto", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                            Seçili sınıfa ait sanal öğrencileri listelemek için lütfen yukarıdaki menüden bir şube veya <strong>Tüm Şubeler</strong> seçiniz.
                        </p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className={cn(
                        "text-center py-20 px-6 rounded-3xl border max-w-xl mx-auto shadow-xl my-6",
                        ambianceTheme === 'dark' ? "border-white/10 bg-white/5 text-white backdrop-blur-xl" : "border-slate-200 bg-white text-slate-900 shadow-sm"
                    )}>
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <h3 className={cn("text-xl font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                            Kayıtlı Sanal Öğrenci Bulunamadı
                        </h3>
                        <p className={cn("text-sm mt-2 leading-relaxed max-w-md mx-auto", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                            Bu şubede henüz kayıtlı sanal öğrenci bulunamadı. Kur&apos;an takip sistemi yalnızca sanal öğrenciler (misafir öğrenci) ile çalışmaktadır.
                        </p>
                        <div className="mt-5">
                            <Button asChild variant="outline" className={cn(
                                "rounded-2xl font-bold text-xs gap-2",
                                ambianceTheme === 'dark' ? "border-white/20 bg-white/10 text-white hover:bg-white/20" : "border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100"
                            )}>
                                <Link href="/teacher/guest-students">
                                    <Users className="w-4 h-4" />
                                    Sanal Öğrenci Yönetimine Git
                                </Link>
                            </Button>
                        </div>
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
                                        "rounded-3xl border transition-all duration-300 flex flex-col justify-between p-4 sm:p-5 shadow-xl hover:shadow-2xl hover:-translate-y-1.5 relative select-none group",
                                        ambianceTheme === 'dark'
                                            ? "bg-white/5 border-white/10 hover:border-violet-400/40 hover:bg-white/8 ring-1 ring-white/5 hover:ring-violet-500/20 hover:shadow-violet-900/30 backdrop-blur-sm text-white"
                                            : "bg-white border-slate-200/90 shadow-md hover:border-violet-300 hover:shadow-lg text-slate-900"
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
                                                        "font-black text-sm sm:text-base leading-tight truncate transition-colors",
                                                        ambianceTheme === 'dark' ? "text-white group-hover:text-emerald-400" : "text-slate-900 group-hover:text-violet-700"
                                                    )}>
                                                        {student.displayName}
                                                    </h3>
                                                    <div className={cn("flex items-center gap-1.5 mt-0.5 text-[11px] font-mono font-bold", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                                                        <span>No: {student.studentNumber || '-'}</span>
                                                        <span>•</span>
                                                        <span className="text-violet-500">#{idx + 1}</span>
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
                                                                : "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                        )}
                                                        title="30 Diyanet Adımını Doğrudan İşaretle"
                                                    >
                                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                                    </button>
                                                </PopoverTrigger>
                                                <PopoverContent className={cn(
                                                    "w-80 p-3 rounded-2xl border shadow-2xl space-y-2",
                                                    ambianceTheme === 'dark'
                                                        ? "bg-indigo-950/95 border-white/15 text-white backdrop-blur-xl"
                                                        : "bg-white border-slate-200 text-slate-900 shadow-xl"
                                                )}>
                                                    <div className={cn("pb-2 border-b", ambianceTheme === 'dark' ? "border-white/10" : "border-slate-100")}>
                                                        <h4 className={cn("font-bold text-xs", ambianceTheme === 'dark' ? "text-violet-200" : "text-slate-900")}>{student.displayName}</h4>
                                                        <p className={cn("text-[10px]", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>Diyanet basamaklarını doğrudan işaretleyin:</p>
                                                    </div>
                                                    <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                                        {DIYANET_SECTIONS.map(sec => {
                                                            const stagesInSec = DIYANET_ELIFBA_STAGES.filter(s => s.section === sec.id && s.category !== 'quran');
                                                            return (
                                                                <div key={sec.id} className="space-y-1">
                                                                    <div className={cn("text-[10px] font-black uppercase tracking-wider px-1 pt-1", ambianceTheme === 'dark' ? "text-violet-400" : "text-violet-700")}>
                                                                        {sec.title}
                                                                    </div>
                                                                    {stagesInSec.map(stg => {
                                                                        const isComp = isDiyanetStageCompleted(prog?.stages, stg.id);
                                                                        const isInProg = prog?.stages[stg.id]?.status === 'in_progress';
                                                                        return (
                                                                            <div key={stg.id} className={cn("flex items-center justify-between p-1.5 rounded-xl text-xs", ambianceTheme === 'dark' ? "bg-white/5" : "bg-slate-50 border border-slate-100")}>
                                                                                <span className={cn("truncate max-w-[140px] font-medium text-[11px]", ambianceTheme === 'dark' ? "text-slate-200" : "text-slate-800")}>
                                                                                    {stg.shortTitle}
                                                                                </span>
                                                                                <div className="flex items-center gap-1">
                                                                                    <button
                                                                                        onClick={() => handleSetStageStatus(student, stg.id, 'completed')}
                                                                                        className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer", isComp ? "bg-emerald-600 text-white font-black" : ambianceTheme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                                                                                        title="Tamamlandı"
                                                                                    >
                                                                                        ✓
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleSetStageStatus(student, stg.id, 'in_progress')}
                                                                                        className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer", isInProg ? "bg-amber-500 text-slate-950 font-black" : ambianceTheme === 'dark' ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}
                                                                                        title="Çalışıyor"
                                                                                    >
                                                                                        ⏳
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleSetStageStatus(student, stg.id, 'not_started')}
                                                                                        className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer", !isComp && !isInProg ? (ambianceTheme === 'dark' ? "bg-slate-700 text-white" : "bg-slate-300 text-slate-700") : (ambianceTheme === 'dark' ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-700"))}
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
                                                ? (ambianceTheme === 'dark' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200")
                                                : stageInfo.level === 'advanced'
                                                ? (ambianceTheme === 'dark' ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200")
                                                : stageInfo.level === 'cezm_med'
                                                ? (ambianceTheme === 'dark' ? "bg-sky-500/10 border-sky-500/30" : "bg-sky-50 border-sky-200")
                                                : (ambianceTheme === 'dark' ? "bg-violet-500/10 border-violet-500/30" : "bg-violet-50 border-violet-200")
                                        )}>
                                            <div className="flex items-center justify-between text-xs font-black mb-1">
                                                <span className="flex items-center gap-1.5">
                                                    {cuzPage && cuzPage > 0 ? (
                                                        <span className={cn("flex items-center gap-1 font-bold", ambianceTheme === 'dark' ? "text-emerald-400" : "text-emerald-800")}>
                                                            <BookOpen className="w-3.5 h-3.5" /> Kur&apos;an-ı Kerim
                                                        </span>
                                                    ) : (
                                                        <span className={cn(
                                                            "flex items-center gap-1 font-bold",
                                                            stageInfo.level === 'advanced' ? (ambianceTheme === 'dark' ? "text-amber-400" : "text-amber-800") :
                                                            stageInfo.level === 'cezm_med' ? (ambianceTheme === 'dark' ? "text-sky-400" : "text-sky-800") :
                                                            (ambianceTheme === 'dark' ? "text-violet-400" : "text-violet-900")
                                                        )}>
                                                            <Award className="w-3.5 h-3.5" /> Diyanet Adım {stageInfo.stepNumber} / 30
                                                        </span>
                                                    )}
                                                </span>

                                                <span className={cn("font-mono text-[10px]", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600 font-semibold")}>
                                                    {stageInfo.completedCount} / 30 Adım
                                                </span>
                                            </div>

                                            {/* Cüz Sayfası Düzenleyici & +/- Hızlı Butonlar */}
                                            {cuzPage && cuzPage > 0 ? (
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className={cn(
                                                        "text-base sm:text-lg font-black tracking-tight",
                                                        ambianceTheme === 'dark' ? "text-emerald-300" : "text-emerald-800"
                                                    )}>
                                                        {cuzPage}. Sayfa
                                                    </span>

                                                    {/* Hızlı Sayfa Butonları [-] [+] */}
                                                    <div className={cn(
                                                        "flex items-center gap-1 p-0.5 rounded-xl border",
                                                        ambianceTheme === 'dark' ? "bg-black/40 border-emerald-500/20" : "bg-emerald-100/70 border-emerald-300/70"
                                                    )}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickChangeCuzPage(student, -1)}
                                                            className={cn(
                                                                "w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer",
                                                                ambianceTheme === 'dark'
                                                                    ? "bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-300"
                                                                    : "bg-white hover:bg-emerald-200 text-emerald-800 shadow-sm"
                                                            )}
                                                            title="Önceki Sayfa [-1]"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuickChangeCuzPage(student, +1)}
                                                            className={cn(
                                                                "w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer",
                                                                ambianceTheme === 'dark'
                                                                    ? "bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300"
                                                                    : "bg-white hover:bg-emerald-200 text-emerald-800 shadow-sm"
                                                            )}
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
                                                            ambianceTheme === 'dark' ? "text-white" : "text-slate-900 font-bold"
                                                        )}>
                                                            {stageInfo.currentTitle}
                                                        </span>
                                                        <span className={cn("font-mono text-[11px] font-black shrink-0", ambianceTheme === 'dark' ? "text-emerald-400" : "text-emerald-700")}>
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
                                                                            ? "bg-emerald-500"
                                                                            : isCurrent
                                                                            ? "bg-amber-500 animate-pulse"
                                                                            : ambianceTheme === 'dark' ? "bg-white/10" : "bg-slate-300"
                                                                    )}
                                                                    title={`Adım ${step}`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Aktif Aşama Harf Değerlendirme Özeti */}
                                            {(() => {
                                                const currentStageProg = prog?.stages?.[stageInfo.currentStageId];
                                                const statuses = currentStageProg?.itemStatuses || {};
                                                const correctCount = Object.values(statuses).filter(s => s === '+').length;
                                                const helpCount = Object.values(statuses).filter(s => s === 'o').length;
                                                const repeatCount = Object.values(statuses).filter(s => s === '-').length;
                                                const totalEvaluated = Object.keys(statuses).length;

                                                if (totalEvaluated === 0) return null;

                                                return (
                                                    <div className={cn(
                                                        "mt-2 pt-2 border-t flex items-center justify-between text-[11px] font-bold",
                                                        ambianceTheme === 'dark' ? "border-white/10" : "border-slate-200"
                                                    )}>
                                                        <span className="flex items-center gap-1 opacity-75 text-[10px]">
                                                            <GraduationCap className="w-3 h-3 text-violet-400" />
                                                            <span>Harf Analizi:</span>
                                                        </span>
                                                        <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                                            <span className="text-emerald-400" title="Doğru">✓{correctCount}</span>
                                                            <span className="text-amber-400" title="Yardımla">◎{helpCount}</span>
                                                            <span className={cn(repeatCount > 0 ? "text-rose-400 font-black animate-pulse" : "text-slate-400")} title="Tekrar Gereken">✗{repeatCount}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Kart Alt Eylemleri: Doğrudan Canlı Test Butonu */}
                                    <div className={cn("pt-3 mt-3 flex items-center gap-2", ambianceTheme === 'dark' ? "border-t border-white/8" : "border-t border-slate-100")}>
                                        <Button
                                            onClick={() => handleStartLiveTest(student)}
                                            className="flex-1 h-9 rounded-xl font-black text-xs transition-all shadow-md bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-violet-900/40 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-white" />
                                            <span>Canlı Test Et</span>
                                        </Button>

                                        {/* Harf Değerlendirme Karnesi */}
                                        <button
                                            type="button"
                                            onClick={() => handleOpenLetterReport(student, stageInfo.currentStageId)}
                                            className={cn(
                                                "h-9 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0",
                                                ambianceTheme === 'dark'
                                                    ? "bg-white/6 border-white/12 text-violet-300 hover:text-white hover:bg-white/10"
                                                    : "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100"
                                            )}
                                            title="Detaylı Harf Değerlendirme Karnesini Aç"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Karne</span>
                                        </button>

                                        {/* Hızlı Cüz Sayfası Belirle */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        "h-9 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                                                        cuzPage && cuzPage > 0
                                                            ? (ambianceTheme === 'dark' ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25" : "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200")
                                                            : (ambianceTheme === 'dark' ? "bg-white/6 border-white/12 text-slate-400 hover:text-white hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200")
                                                    )}
                                                    title="Kur'an-ı Kerim Sayfasını Belirle"
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    <span>{cuzPage && cuzPage > 0 ? `${cuzPage}p` : 'Cüz'}</span>
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className={cn(
                                                "w-52 p-3 rounded-2xl border shadow-xl space-y-2",
                                                ambianceTheme === 'dark'
                                                    ? "bg-indigo-950/95 border-white/15 text-white backdrop-blur-xl"
                                                    : "bg-white border-slate-200 text-slate-900 shadow-xl"
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
                                                            ambianceTheme === 'dark'
                                                                ? "bg-white/8 border-white/15 text-white"
                                                                : "bg-slate-50 border-slate-300 text-slate-900"
                                                        )}
                                                    />
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            const el = document.getElementById(`cuz-input-${student.uid}`) as HTMLInputElement;
                                                            if (el) handleSaveCuzPage(student, parseInt(el.value, 10));
                                                        }}
                                                        className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
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
                        "rounded-3xl border transition-all shadow-2xl overflow-hidden",
                        ambianceTheme === 'dark'
                            ? "bg-white/5 border-white/12 shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm text-white"
                            : "bg-white border-slate-200 shadow-sm text-slate-900"
                    )}>
                        {/* Matris Bölüm Filtre Sekmeleri */}
                        <div className={cn(
                            "p-3 border-b flex items-center justify-between flex-wrap gap-2",
                            ambianceTheme === 'dark' ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"
                        )}>
                            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar text-xs">
                                <button
                                    type="button"
                                    onClick={() => setMatrixSection('all')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl font-black transition-all cursor-pointer text-xs shrink-0",
                                        matrixSection === 'all'
                                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm"
                                            : ambianceTheme === 'dark' ? "bg-white/6 border border-white/10 text-slate-400 hover:text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
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
                                                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
                                                : ambianceTheme === 'dark' ? "bg-white/6 border border-white/10 text-slate-400 hover:text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                        )}
                                    >
                                        {sec.title}
                                    </button>
                                ))}
                            </div>
                            <span className={cn("text-[11px] font-mono", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600 font-semibold")}>
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
                                                ? "bg-indigo-950 text-white border-white/15"
                                                : "bg-slate-100 text-slate-900 border-slate-200"
                                        )}>
                                            Öğrenci Adı &amp; No
                                        </th>

                                        {/* Kur'an / Cüz Sayfa Sütunu (Adım 30) */}
                                        <th className={cn(
                                            "sticky top-0 z-30 font-black text-xs px-3 py-3.5 border-b border-r text-center min-w-[130px]",
                                            ambianceTheme === 'dark'
                                                ? "bg-emerald-900/80 text-emerald-200 border-emerald-500/30"
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
                                                        ? "bg-indigo-950/95 text-violet-200 border-white/10"
                                                        : "bg-slate-100/95 text-slate-700 border-slate-200"
                                                )}
                                                title={`${stage.title} (${stage.itemCount} kart)`}
                                            >
                                                <span className="block font-black">{stage.shortTitle}</span>
                                                <span className={cn("text-[9px] font-mono font-normal", ambianceTheme === 'dark' ? "opacity-60" : "text-slate-500")}>{stage.itemCount} kart</span>
                                            </th>
                                        ))}

                                        {/* Hızlı Aksiyon Sütunu */}
                                        <th className={cn(
                                            "sticky top-0 right-0 z-30 font-black text-xs px-3 py-3 border-b text-center min-w-[130px] print-hide",
                                            ambianceTheme === 'dark'
                                                ? "bg-indigo-950 text-white border-white/15"
                                                : "bg-slate-100 text-slate-900 border-slate-200"
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
                                                        ? "bg-indigo-950/90 group-hover:bg-indigo-900/70 text-white border-white/10"
                                                        : "bg-white group-hover:bg-slate-50 text-slate-900 border-slate-200"
                                                )}>
                                                    <span className={cn("font-mono text-[10px] w-5 text-right", ambianceTheme === 'dark' ? "text-slate-500" : "text-slate-400")}>{sIdx + 1}.</span>
                                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-pink-600 text-white font-black flex items-center justify-center text-[10px] shrink-0 shadow-sm shadow-violet-900/40">
                                                        {student.displayName?.charAt(0) || 'Ö'}
                                                    </div>
                                                    <div className="truncate min-w-0">
                                                        <span className="truncate block max-w-[150px]">{student.displayName}</span>
                                                        <span className={cn("text-[10px] font-mono font-normal", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>#{student.studentNumber || '-'}</span>
                                                    </div>
                                                </td>

                                                {/* Cüz / Sayfa Hücresi */}
                                                <td className={cn(
                                                    "text-center px-2 py-2 border-r",
                                                    ambianceTheme === 'dark' ? "bg-emerald-900/15 border-white/10" : "bg-emerald-50/40 border-slate-200"
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
                                                                className={cn(
                                                                    "w-16 h-7 text-xs text-center font-black p-0 rounded-lg",
                                                                    ambianceTheme === 'dark'
                                                                        ? "bg-slate-950 border-emerald-500/50 text-emerald-300"
                                                                        : "bg-white border-emerald-400 text-emerald-900"
                                                                )}
                                                                autoFocus
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleSaveCuzPage(student)}
                                                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 cursor-pointer"
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
                                                                    ? (ambianceTheme === 'dark' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200")
                                                                    : (ambianceTheme === 'dark' ? "bg-slate-900 border-white/5 text-slate-500 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200")
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
                                                                                ? (ambianceTheme === 'dark'
                                                                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-emerald-950/20"
                                                                                    : "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200 shadow-sm")
                                                                                : isInProg
                                                                                ? (ambianceTheme === 'dark'
                                                                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 animate-pulse"
                                                                                    : "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200 animate-pulse shadow-sm")
                                                                                : (ambianceTheme === 'dark'
                                                                                    ? "bg-slate-900/50 border-white/5 text-slate-600 hover:text-white"
                                                                                    : "bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-200")
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
                                                                            <span className={cn("text-xs", ambianceTheme === 'dark' ? "text-slate-600" : "text-slate-400")}>-</span>
                                                                        )}
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className={cn(
                                                                    "w-64 sm:w-72 p-3.5 rounded-2xl border shadow-xl space-y-2.5",
                                                                    ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"
                                                                )}>
                                                                    <div className={cn("border-b pb-2", ambianceTheme === 'dark' ? "border-white/10" : "border-slate-100")}>
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-bold block truncate">{stage.title}</span>
                                                                            {score !== undefined && (
                                                                                <Badge className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                                    %{score}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                        <span className={cn("text-[11px] font-medium block", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>
                                                                            {student.displayName}
                                                                        </span>
                                                                    </div>

                                                                    {/* Harf Değerlendirme Özeti ve Mini Gösterim */}
                                                                    {(() => {
                                                                        const stageData = prog?.stages?.[stage.id];
                                                                        const itemStatuses = stageData?.itemStatuses || {};
                                                                        const evaluatedCount = Object.keys(itemStatuses).length;
                                                                        const correctCount = Object.values(itemStatuses).filter(s => s === '+').length;
                                                                        const helpCount = Object.values(itemStatuses).filter(s => s === 'o').length;
                                                                        const repeatCount = Object.values(itemStatuses).filter(s => s === '-').length;

                                                                        return (
                                                                            <div className="space-y-2">
                                                                                {evaluatedCount > 0 ? (
                                                                                    <>
                                                                                        <div className="grid grid-cols-3 gap-1">
                                                                                            <div className="px-1.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-center">
                                                                                                <span className="text-[11px] font-mono font-black block">✓ {correctCount}</span>
                                                                                                <span className="text-[8px] block opacity-80 uppercase">Doğru</span>
                                                                                            </div>
                                                                                            <div className="px-1.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-center">
                                                                                                <span className="text-[11px] font-mono font-black block">◎ {helpCount}</span>
                                                                                                <span className="text-[8px] block opacity-80 uppercase">Yardım</span>
                                                                                            </div>
                                                                                            <div className="px-1.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-center">
                                                                                                <span className="text-[11px] font-mono font-black block">✗ {repeatCount}</span>
                                                                                                <span className="text-[8px] block opacity-80 uppercase">Tekrar</span>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Mini Harf Rozetleri */}
                                                                                        <div className="max-h-20 overflow-y-auto custom-scrollbar p-1.5 rounded-xl bg-black/20 border border-white/5 flex flex-wrap gap-1">
                                                                                            {Array.from({ length: stage.itemCount }, (_, i) => i + 1).map(num => {
                                                                                                const st = itemStatuses[num] || itemStatuses[String(num)];
                                                                                                const meta = getStageItemMeta(stage.id, num);
                                                                                                const label = stage.id === 'cuz1' && meta.arabic ? meta.arabic : String(num);
                                                                                                return (
                                                                                                    <span
                                                                                                        key={num}
                                                                                                        title={`${meta.name}: ${st === '+' ? 'Doğru' : st === 'o' ? 'Yardımla' : st === '-' ? 'Tekrar Gerekiyor' : 'Bakılmadı'}`}
                                                                                                        className={cn(
                                                                                                            "w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center border",
                                                                                                            st === '+' ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300 font-bold" :
                                                                                                            st === 'o' ? "bg-amber-500/25 border-amber-500/50 text-amber-300 font-bold" :
                                                                                                            st === '-' ? "bg-rose-500/30 border-rose-500/60 text-rose-300 font-black animate-pulse" :
                                                                                                            "bg-white/5 border-white/10 text-slate-500 opacity-40"
                                                                                                        )}
                                                                                                    >
                                                                                                        {label}
                                                                                                    </span>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="text-[10px] text-center text-slate-400 py-1 bg-white/5 rounded-lg border border-white/5">
                                                                                        Detaylı harf testi henüz yapılmadı.
                                                                                    </div>
                                                                                )}

                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() => handleOpenLetterReport(student, stage.id)}
                                                                                    className={cn(
                                                                                        "w-full h-7 text-[11px] font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5",
                                                                                        ambianceTheme === 'dark' ? "border-violet-500/40 text-violet-300 hover:bg-violet-500/20" : "border-violet-300 text-violet-700 hover:bg-violet-50"
                                                                                    )}
                                                                                >
                                                                                    <Eye className="w-3 h-3" /> Harf Karnesini Gör
                                                                                </Button>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* Durum Değiştirme Butonları */}
                                                                    <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/10">
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'completed')}
                                                                            className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg cursor-pointer"
                                                                        >
                                                                            ✓ Geçti
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'in_progress')}
                                                                            className="h-7 text-[10px] bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg cursor-pointer"
                                                                        >
                                                                            ⏳ Çalışıyor
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() => handleSetStageStatus(student, stage.id, 'not_started')}
                                                                            className={cn(
                                                                                "h-7 text-[10px] rounded-lg cursor-pointer",
                                                                                ambianceTheme === 'dark'
                                                                                    ? "border-white/10 text-slate-400 hover:text-white"
                                                                                    : "border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                                            )}
                                                                        >
                                                                            Sıfırla
                                                                        </Button>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleStartLiveTest(student, stage.id)}
                                                                        className="w-full h-8 text-xs bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold rounded-lg cursor-pointer"
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
                                                        onClick={() => handleStartLiveTest(student)}
                                                        className="h-8 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-md shadow-violet-900/40 cursor-pointer"
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
                    </>
                ) : (
                    /* ──────────────────────────────────────────────────────────── */
                    /* MEB KUR'AN-I KERİM DERS KİTABI OKUMA SAYFALARI & TİLAVET MODÜLÜ */
                    /* ──────────────────────────────────────────────────────────── */
                    <div className="space-y-6">
                        
                        {/* 1. Sınıf Seviye Seçimi (5, 6, 7, 8. Sınıf) + Bilgilendirme */}
                        <div className={cn(
                            "p-4 sm:p-5 rounded-3xl border transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print-hide",
                            ambianceTheme === 'dark' ? "bg-white/6 border-white/12 backdrop-blur-2xl" : "bg-white border-slate-200 shadow-sm"
                        )}>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h2 className={cn("text-base sm:text-lg font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                                        Ders Kitabı Sınıf Seviyesi
                                    </h2>
                                    <Badge className={cn(
                                        "text-[11px] font-bold border",
                                        ambianceTheme === 'dark'
                                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                            : "bg-purple-100 text-purple-800 border-purple-200"
                                    )}>
                                        MEB Müfredatı
                                    </Badge>
                                </div>
                                <p className={cn("text-xs", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                    Sınıf Kur&apos;an ders kitabında yer alan okuma sayfalarını seçin ve tahtada canlı okutun.
                                </p>
                            </div>

                            {/* Sınıf Düğmeleri (5, 6, 7, 8) */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                                {([5, 6, 7, 8] as const).map(gr => {
                                    const count = bookPages.filter(p => p.grade === gr).length;
                                    const isSelected = selectedBookGrade === gr;
                                    return (
                                        <button
                                            key={gr}
                                            type="button"
                                            onClick={() => {
                                                setSelectedBookGrade(gr);
                                                const pages = bookPages.filter(p => p.grade === gr).sort((a, b) => a.pageNumber - b.pageNumber);
                                                if (pages.length > 0) {
                                                    setTestingBookPageId(pages[0].id);
                                                }
                                            }}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer border shrink-0",
                                                isSelected
                                                    ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-purple-900/40 border-pink-500/40 scale-105"
                                                    : ambianceTheme === 'dark'
                                                        ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                                                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                                            )}
                                        >
                                            <span>{gr}. Sınıf</span>
                                            <span className={cn(
                                                "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                                                isSelected ? "bg-white/25 text-white" : ambianceTheme === 'dark' ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-600"
                                            )}>
                                                {count} Sayfa
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 2. Ders Kitabı İstatistik Şeridi */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print-hide">
                            {/* 1. Seçili Sınıf Sayfaları */}
                            <div className={cn(
                                "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5",
                                ambianceTheme === 'dark'
                                    ? "border-white/15 bg-gradient-to-br from-violet-600/25 via-purple-600/15 to-violet-900/20 ring-1 ring-violet-500/20 backdrop-blur-sm"
                                    : "border-violet-100 bg-white shadow-sm ring-1 ring-violet-200/50"
                            )}>
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/40">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-violet-300" : "text-violet-700")}>{selectedBookGrade}. Sınıf Müfredatı</div>
                                    <div className={cn("text-xl sm:text-2xl font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>{bookStats.pagesCount} Okuma Sayfası</div>
                                </div>
                            </div>

                            {/* 2. Okuma Yapan Öğrenciler */}
                            <div className={cn(
                                "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5",
                                ambianceTheme === 'dark'
                                    ? "border-white/15 bg-gradient-to-br from-emerald-600/25 via-teal-600/15 to-emerald-900/20 ring-1 ring-emerald-500/20 backdrop-blur-sm"
                                    : "border-emerald-100 bg-white shadow-sm ring-1 ring-emerald-200/50"
                            )}>
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/40">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-emerald-300" : "text-emerald-700")}>Okuyan Öğrenci</div>
                                    <div className={cn("text-xl sm:text-2xl font-black", ambianceTheme === 'dark' ? "text-emerald-100" : "text-slate-900")}>
                                        {bookStats.studentsWithReadings} / {bookStats.totalStudents}
                                        <span className={cn(
                                            "text-xs font-mono font-bold ml-1.5",
                                            ambianceTheme === 'dark' ? "text-emerald-400" : "text-emerald-700"
                                        )}>
                                            (%{bookStats.completionPercent})
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Sınıf Tilavet & Tecvid Ortalaması */}
                            <div className={cn(
                                "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5",
                                ambianceTheme === 'dark'
                                    ? "border-white/15 bg-gradient-to-br from-amber-600/25 via-orange-600/15 to-amber-900/20 ring-1 ring-amber-500/20 backdrop-blur-sm"
                                    : "border-amber-100 bg-white shadow-sm ring-1 ring-amber-200/50"
                            )}>
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/40">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-amber-300" : "text-amber-700")}>Sınıf Tilavet Ortalaması</div>
                                    <div className={cn("text-xl sm:text-2xl font-black flex items-center gap-2", ambianceTheme === 'dark' ? "text-amber-100" : "text-slate-900")}>
                                        <span>{bookStats.averageScore} / 100</span>
                                        {bookStats.totalAssessments > 0 && (
                                            <Badge className={cn(
                                                "border text-[10px] px-1.5 py-0 font-bold",
                                                getTilavetGradeBadge(bookStats.averageScore, ambianceTheme).bg,
                                                getTilavetGradeBadge(bookStats.averageScore, ambianceTheme).color
                                            )}>
                                                {getTilavetGradeBadge(bookStats.averageScore, ambianceTheme).label.split(' ')[0]}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 4. Toplam Okuma Oturumu */}
                            <div className={cn(
                                "p-4 rounded-3xl border shadow-xl flex items-center gap-3.5",
                                ambianceTheme === 'dark'
                                    ? "border-white/15 bg-gradient-to-br from-cyan-600/25 via-blue-600/15 to-cyan-900/20 ring-1 ring-cyan-500/20"
                                    : "border-cyan-100 bg-white shadow-sm ring-1 ring-cyan-200/50"
                            )}>
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/40">
                                    <Award className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className={cn("text-[11px] font-bold", ambianceTheme === 'dark' ? "text-cyan-300" : "text-cyan-700")}>Tamamlanan Oturum</div>
                                    <div className={cn("text-xl sm:text-2xl font-black", ambianceTheme === 'dark' ? "text-cyan-100" : "text-slate-900")}>
                                        {bookStats.totalAssessments} Değerlendirme
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. İpucu & Bilgilendirme Şeridi */}
                        <div className={cn(
                            "p-3.5 rounded-2xl border flex items-start gap-3 text-xs",
                            ambianceTheme === 'dark'
                                ? "border-violet-500/20 bg-violet-950/30 text-violet-200"
                                : "border-violet-200 bg-violet-50/80 text-violet-950 shadow-sm"
                        )}>
                            <Sparkles className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                            <div className="leading-relaxed">
                                <span className={cn("font-bold", ambianceTheme === 'dark' ? "text-white" : "text-violet-950")}>Pratik Görsel Kullanımı:</span> Kitap sayfalarının fotoğraflarını veya taranmış görsellerini projenin{' '}
                                <code className={cn(
                                    "px-1.5 py-0.5 rounded font-mono text-[11px] border",
                                    ambianceTheme === 'dark' ? "bg-black/40 text-pink-300 border-white/10" : "bg-white text-pink-600 border-violet-200"
                                )}>
                                    public/kuran/{selectedBookGrade}/sayfa1.jpg
                                </code>{' '}
                                klasörüne ekleyebilir veya doğrudan internet linki verebilirsiniz. Sayfaları yukarıdaki butonlarla kolayca ekleyebilir, düzenleyebilir ve silebilirsiniz.
                            </div>
                        </div>

                        {/* 4. Seçili Sınıfın Okuma Sayfaları Galerisi */}
                        <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
                                <div className="flex items-center gap-2">
                                    <h3 className={cn("text-base font-black", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                                        {selectedBookGrade}. Sınıf Okuma Sayfaları &amp; Sureler
                                    </h3>
                                    <Badge variant="outline" className={cn(
                                        "text-xs",
                                        ambianceTheme === 'dark' ? "border-white/15 text-slate-400" : "border-slate-300 text-slate-700 bg-white"
                                    )}>
                                        {currentGradePages.length} Sayfa
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        onClick={() => handleOpenAddPage(selectedBookGrade)}
                                        className="h-9 px-3.5 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/30 hover:scale-[1.02] transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        <FilePlus2 className="w-4 h-4" />
                                        <span>Yeni Sayfa Ekle</span>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleResetPagesToDefault}
                                        className={cn(
                                            "h-9 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer flex items-center gap-1.5",
                                            ambianceTheme === 'dark'
                                                ? "border-white/12 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
                                                : "border-slate-300 text-slate-700 hover:bg-slate-100 bg-white"
                                        )}
                                        title="MEB Varsayılan Sayfalarına Sıfırla"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Sıfırla</span>
                                    </Button>
                                </div>
                            </div>

                            {currentGradePages.length === 0 ? (
                                <div className={cn(
                                    "text-center py-16 px-6 rounded-3xl border border-dashed flex flex-col items-center justify-center gap-3",
                                    ambianceTheme === 'dark' ? "border-white/15 bg-white/5 backdrop-blur-sm" : "border-slate-300 bg-white"
                                )}>
                                    <BookOpen className="w-12 h-12 text-slate-400 opacity-40" />
                                    <h4 className={cn("font-black text-base", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                                        {selectedBookGrade}. Sınıf İçin Okuma Sayfası Bulunamadı
                                    </h4>
                                    <p className={cn("text-xs max-w-md", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                        Bu sınıf seviyesine ait henüz bir sayfa tanımlanmamış. Dilediğiniz sayfa numarası, sûre bilgisi ve âyet metinleriyle hemen yeni bir sayfa ekleyin.
                                    </p>
                                    <Button
                                        onClick={() => handleOpenAddPage(selectedBookGrade)}
                                        className="mt-2 h-9 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg cursor-pointer"
                                    >
                                        <FilePlus2 className="w-4 h-4 mr-1.5" /> Yeni Okuma Sayfası Ekle
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {currentGradePages.map((page) => {
                                        // Bu sayfayı kaç öğrenci okumuş
                                        let completedThisPage = 0;
                                        students.forEach(s => {
                                            const rec = progressMap[s.uid]?.bookReadings?.[page.id];
                                            if (rec && rec.score !== undefined) {
                                                completedThisPage++;
                                            }
                                        });
                                        const compPercent = students.length > 0 ? Math.round((completedThisPage / students.length) * 100) : 0;

                                        return (
                                            <div
                                                key={page.id}
                                                className={cn(
                                                    "rounded-3xl border transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between shadow-xl hover:shadow-2xl hover:-translate-y-1 relative group",
                                                    ambianceTheme === 'dark'
                                                        ? "bg-white/5 border-white/10 hover:border-pink-500/40 ring-1 ring-white/5 backdrop-blur-sm text-white"
                                                        : "bg-white border-slate-200/90 shadow-md hover:border-violet-300 text-slate-900"
                                                )}
                                            >
                                                <div className="space-y-3">
                                                    {/* Üst Rozetler: Sınıf & Sayfa No & Eylemler (Düzenle / Sil) */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-xs border-0 px-2.5 py-0.5">
                                                            Sayfa {page.pageNumber}
                                                        </Badge>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={(e) => { e.stopPropagation(); handleOpenEditPage(page); }}
                                                                className={cn(
                                                                    "h-7 w-7 rounded-lg transition-all cursor-pointer",
                                                                    ambianceTheme === 'dark'
                                                                        ? "text-slate-400 hover:text-white hover:bg-white/10"
                                                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                                                )}
                                                                title="Sayfayı Düzenle"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={(e) => { e.stopPropagation(); setPageToDelete(page); }}
                                                                className={cn(
                                                                    "h-7 w-7 rounded-lg transition-all cursor-pointer",
                                                                    ambianceTheme === 'dark'
                                                                        ? "text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/15"
                                                                        : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                                )}
                                                                title="Sayfayı Sil"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className={cn(
                                                        "text-[11px] font-mono font-semibold truncate",
                                                        ambianceTheme === 'dark' ? "text-purple-300" : "text-purple-700"
                                                    )}>
                                                        {page.surahInfo}
                                                    </div>

                                                    {/* Başlık & Açıklama */}
                                                    <div>
                                                        <h4 className={cn(
                                                            "font-black text-sm sm:text-base transition-colors line-clamp-1",
                                                            ambianceTheme === 'dark'
                                                                ? "text-white group-hover:text-pink-300"
                                                                : "text-slate-900 group-hover:text-purple-600"
                                                        )}>
                                                            {page.title}
                                                        </h4>
                                                        <p className={cn("text-xs mt-1 line-clamp-2 leading-relaxed", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                                            {page.description}
                                                        </p>
                                                    </div>

                                                    {/* Arapça Önizleme Kutucuğu */}
                                                    {page.arabicPreview && (
                                                        <div
                                                            dir="rtl"
                                                            className={cn(
                                                                "p-3 rounded-2xl border text-sm leading-loose font-serif select-none line-clamp-2 text-right",
                                                                ambianceTheme === 'dark'
                                                                    ? "bg-black/40 border-white/10 text-amber-200"
                                                                    : "bg-amber-50/70 border-amber-200 text-amber-950"
                                                            )}
                                                        >
                                                            {page.arabicPreview}
                                                        </div>
                                                    )}

                                                    {/* Sınıf İlerleme Çubuğu */}
                                                    <div className="space-y-1 pt-1">
                                                        <div className={cn(
                                                            "flex items-center justify-between text-[11px] font-semibold",
                                                            ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600"
                                                        )}>
                                                            <span>Okuyan: {completedThisPage} / {students.length}</span>
                                                            <span className={cn(
                                                                "font-mono font-bold",
                                                                ambianceTheme === 'dark' ? "text-emerald-400" : "text-emerald-700"
                                                            )}>
                                                                %{compPercent}
                                                            </span>
                                                        </div>
                                                        <div className={cn("w-full h-1.5 rounded-full overflow-hidden", ambianceTheme === 'dark' ? "bg-white/10" : "bg-slate-200")}>
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                                                                style={{ width: `${compPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Aksiyon Butonu: Canlı Okut */}
                                                <Button
                                                    onClick={() => handleOpenBookTester(page.id)}
                                                    className="w-full mt-4 h-10 rounded-2xl font-black text-xs bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40 hover:scale-[1.02] transition-all cursor-pointer"
                                                >
                                                    <Play className="w-3.5 h-3.5 mr-1.5 fill-white" />
                                                    <span>Canlı Okut &amp; Değerlendir</span>
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 5. Öğrenci Bazlı Okuma Değerlendirme Çizelgesi */}
                        <Card className={cn(
                            "rounded-3xl border shadow-2xl overflow-hidden",
                            ambianceTheme === 'dark' ? "bg-white/5 border-white/12 ring-1 ring-white/5 backdrop-blur-xl text-white" : "bg-white border-slate-200 shadow-md text-slate-900"
                        )}>
                            <div className={cn(
                                "p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-3",
                                ambianceTheme === 'dark' ? "border-white/10" : "border-slate-200 bg-slate-50/50"
                            )}>
                                <div>
                                    <h3 className={cn("text-base sm:text-lg font-black flex items-center gap-2", ambianceTheme === 'dark' ? "text-white" : "text-slate-900")}>
                                        <Users className="w-5 h-5 text-purple-500" />
                                        <span>{selectedBookGrade}. Sınıf Öğrenci Okuma &amp; Tilavet Çizelgesi</span>
                                    </h3>
                                    <p className={cn("text-xs mt-0.5", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                        Öğrencinin okuduğu sayfaları, aldığı puanları inceleyin ya da ilgili sayfaya tıklayarak doğrudan teste başlayın.
                                    </p>
                                </div>

                                {/* Tablo İçi Öğrenci Arama */}
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-purple-400" />
                                    <Input
                                        placeholder="Öğrenci ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={cn(
                                            "h-8.5 pl-8 text-xs rounded-xl border",
                                            ambianceTheme === 'dark'
                                                ? "bg-white/8 border-white/15 text-white placeholder:text-slate-400"
                                                : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className={cn(
                                            "border-b text-[11px] font-black uppercase tracking-wider",
                                            ambianceTheme === 'dark' ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-100/80 text-slate-700"
                                        )}>
                                            <th className="py-3 px-4 w-12 text-center">#</th>
                                            <th className="py-3 px-4">Öğrenci</th>
                                            <th className="py-3 px-4 text-center">Tamamlanan</th>
                                            <th className="py-3 px-4 text-center">Ort. Tilavet Puanı</th>
                                            {currentGradePages.map(p => (
                                                <th key={p.id} className="py-3 px-2 text-center min-w-[100px]">
                                                    <div className={cn("text-[10px] font-bold", ambianceTheme === 'dark' ? "text-purple-300" : "text-purple-700")}>Sayfa {p.pageNumber}</div>
                                                    <div className={cn("text-[9px] font-normal truncate max-w-[90px] mx-auto", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600")}>
                                                        {p.surahInfo.split(' ')[0]}
                                                    </div>
                                                </th>
                                            ))}
                                            <th className="py-3 px-4 text-center">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className={cn("divide-y text-xs font-medium", ambianceTheme === 'dark' ? "divide-white/5" : "divide-slate-200")}>
                                        {!selectedClassId ? (
                                            <tr>
                                                <td colSpan={5 + currentGradePages.length} className="text-center py-12 text-slate-400 font-semibold">
                                                    Lütfen yukarıdaki menüden bir sınıf seçiniz.
                                                </td>
                                            </tr>
                                        ) : !selectedBranch ? (
                                            <tr>
                                                <td colSpan={5 + currentGradePages.length} className="text-center py-12 text-slate-400 font-semibold">
                                                    Lütfen yukarıdaki menüden bir şube seçiniz.
                                                </td>
                                            </tr>
                                        ) : filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={5 + currentGradePages.length} className="text-center py-12 text-slate-400 font-semibold">
                                                    Bu şubede kayıtlı sanal öğrenci bulunamadı.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map((student, idx) => {
                                                const prog = progressMap[student.uid];
                                                const readings = prog?.bookReadings || {};
                                                const pages = currentGradePages;
                                                
                                                let completedCount = 0;
                                                let scoreSum = 0;
                                                pages.forEach(p => {
                                                    const rec = readings[p.id];
                                                    if (rec && rec.score !== undefined) {
                                                        completedCount++;
                                                        scoreSum += rec.score;
                                                    }
                                                });
                                                const avgScore = completedCount > 0 ? Math.round(scoreSum / completedCount) : null;
                                                const badge = avgScore !== null ? getTilavetGradeBadge(avgScore, ambianceTheme) : null;

                                                return (
                                                    <tr
                                                        key={student.uid}
                                                        className={cn(
                                                            "transition-colors group",
                                                            ambianceTheme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50"
                                                        )}
                                                    >
                                                        {/* Sıra No */}
                                                        <td className={cn("py-2.5 px-4 text-center font-mono text-[11px]", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600 font-semibold")}>
                                                            {idx + 1}
                                                        </td>

                                                        {/* Öğrenci İsim ve No */}
                                                        <td className="py-2.5 px-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-pink-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                                                                    {student.displayName?.charAt(0) || 'Ö'}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className={cn(
                                                                        "font-bold transition-colors truncate",
                                                                        ambianceTheme === 'dark' ? "text-white group-hover:text-pink-300" : "text-slate-900 group-hover:text-purple-600"
                                                                    )}>
                                                                        {student.displayName}
                                                                    </div>
                                                                    <div className={cn("text-[10px] font-mono", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600 font-semibold")}>
                                                                        No: {student.studentNumber || '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Tamamlanan */}
                                                        <td className="py-2.5 px-4 text-center">
                                                            <Badge variant="outline" className={cn(
                                                                "font-mono text-[11px] px-2 py-0.5",
                                                                completedCount === pages.length && pages.length > 0
                                                                    ? (ambianceTheme === 'dark' ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10" : "border-emerald-300 text-emerald-800 bg-emerald-50 font-bold")
                                                                    : completedCount > 0
                                                                        ? (ambianceTheme === 'dark' ? "border-amber-500/50 text-amber-300 bg-amber-500/10" : "border-amber-300 text-amber-900 bg-amber-50 font-bold")
                                                                        : (ambianceTheme === 'dark' ? "border-white/10 text-slate-400" : "border-slate-300 text-slate-600 bg-slate-50")
                                                            )}>
                                                                {completedCount} / {pages.length} Sayfa
                                                            </Badge>
                                                        </td>

                                                        {/* Ortalama Tilavet Puanı */}
                                                        <td className="py-2.5 px-4 text-center">
                                                            {avgScore !== null ? (
                                                                <Badge className={cn("font-bold text-xs px-2.5 py-0.5 border", badge?.bg, badge?.color)}>
                                                                    {avgScore} Puan
                                                                </Badge>
                                                            ) : (
                                                                <span className={cn("text-[11px]", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500 font-bold")}>-</span>
                                                            )}
                                                        </td>

                                                        {/* Her Bir Sayfa İçin Buton */}
                                                        {pages.map(p => {
                                                            const rec = readings[p.id];
                                                            return (
                                                                <td key={p.id} className="py-2.5 px-2 text-center">
                                                                    {rec && rec.score !== undefined ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenBookTester(p.id, student)}
                                                                            className={cn(
                                                                                "px-2 py-1 rounded-xl text-[11px] font-black border transition-all hover:scale-105 cursor-pointer shadow-sm",
                                                                                rec.score >= 85
                                                                                    ? (ambianceTheme === 'dark'
                                                                                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                                                                                        : "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200")
                                                                                    : rec.score >= 60
                                                                                        ? (ambianceTheme === 'dark'
                                                                                            ? "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
                                                                                            : "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200")
                                                                                        : (ambianceTheme === 'dark'
                                                                                            ? "bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30"
                                                                                            : "bg-rose-100 border-rose-300 text-rose-900 hover:bg-rose-200")
                                                                            )}
                                                                            title={`Sayfa ${p.pageNumber}: ${rec.score} Puan - Yeniden Test Etmek İçin Tıklayın`}
                                                                        >
                                                                            {rec.score}p
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenBookTester(p.id, student)}
                                                                            className={cn(
                                                                                "px-2 py-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer",
                                                                                ambianceTheme === 'dark'
                                                                                    ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-purple-400/40"
                                                                                    : "border-slate-300 text-slate-600 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-300 bg-white"
                                                                            )}
                                                                            title={`Sayfa ${p.pageNumber} için Okuma Başlat`}
                                                                        >
                                                                            + Okut
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}

                                                        {/* Hızlı Aksiyon */}
                                                         <td className="py-2.5 px-4 text-center">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    const inProgressPage = pages.find(p => readings[p.id]?.status === 'in_progress');
                                                                    const unreadPage = pages.find(p => !readings[p.id] || readings[p.id]?.status === 'needs_practice');
                                                                    const target = inProgressPage || unreadPage || pages[0];
                                                                    handleOpenBookTester(target ? target.id : 'p5-1', student);
                                                                }}
                                                                className="h-7 px-2.5 rounded-xl font-bold text-[11px] bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-md shadow-purple-900/30 cursor-pointer"
                                                            >
                                                                <Play className="w-2.5 h-2.5 mr-1 fill-white" /> Oku
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
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
                onSelectStudent={(s) => {
                    setTestingStudent(s);
                    const info = getStudentStageInfo(s.uid);
                    setTestingStageId(info.currentStageId);
                }}
                currentProgress={testingStudent ? progressMap[testingStudent.uid] : undefined}
                initialStageId={testingStageId}
                classId={selectedClassId}
                className={className}
                branch={selectedBranch}
                onProgressSaved={loadTrackerData}
                ambianceTheme={ambianceTheme}
            />

            {/* 5.B DETAYLI HARF & AŞAMA DEĞERLENDİRME KARNESİ MODALI */}
            <StudentLetterReportDialog
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                student={reportStudent}
                initialStageId={reportStageId}
                classId={selectedClassId}
                className={className}
                branch={selectedBranch}
                progress={reportStudent ? progressMap[reportStudent.uid] : undefined}
                onStartLiveTest={(st, stageId) => {
                    handleStartLiveTest(st, stageId);
                }}
                onProgressSaved={loadTrackerData}
                ambianceTheme={ambianceTheme}
            />

            {/* ──────────────────────────────────────────────────────────── */}
            {/* 6. MEB KUR'AN DERS KİTABI CANLI OKUMA & 10 KRİTERLİ RUBRİK MODALI */}
            {/* ──────────────────────────────────────────────────────────── */}
            <BookReadingTester
                isOpen={isBookTesterOpen}
                onClose={() => setIsBookTesterOpen(false)}
                student={testingBookStudent}
                allStudents={students}
                onSelectStudent={(s) => {
                    setTestingBookStudent(s);
                    const prog = progressMap[s.uid];
                    const readings = prog?.bookReadings || {};
                    const pages = bookPages.filter(p => p.grade === selectedBookGrade).sort((a, b) => a.pageNumber - b.pageNumber);
                    const inProgressPage = pages.find(p => readings[p.id]?.status === 'in_progress');
                    const unreadPage = pages.find(p => !readings[p.id] || readings[p.id]?.status === 'needs_practice');
                    const target = inProgressPage || unreadPage || pages[0];
                    if (target) setTestingBookPageId(target.id);
                }}
                initialPageId={testingBookPageId}
                initialGrade={selectedBookGrade}
                classId={selectedClassId}
                className={className}
                branch={selectedBranch}
                currentProgress={testingBookStudent ? progressMap[testingBookStudent.uid] : undefined}
                onProgressSaved={loadTrackerData}
                allPages={bookPages}
                ambianceTheme={ambianceTheme}
            />

            {/* ──────────────────────────────────────────────────────────── */}
            {/* 7. OKUMA SAYFASI EKLEME / DÜZENLEME MODALI */}
            {/* ──────────────────────────────────────────────────────────── */}
            <Dialog open={isPageDialogOpen} onOpenChange={setIsPageDialogOpen}>
                <DialogContent className={cn(
                    "max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 rounded-3xl border shadow-2xl",
                    ambianceTheme === 'dark' ? "bg-slate-950 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
                )}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-purple-500" />
                            <span>{editingPageId ? 'Okuma Sayfasını Düzenle' : 'Yeni MEB Okuma Sayfası Ekle'}</span>
                        </DialogTitle>
                        <DialogDescription className={cn("text-xs", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600 font-medium")}>
                            MEB Kur&apos;an ders kitabı için sayfa no, sûre adı, açıklama ve âyet metinlerini düzenleyin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3 text-xs">
                        {/* Sınıf & Sayfa No */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className={cn("font-bold block", ambianceTheme === 'dark' ? "text-slate-300" : "text-slate-700")}>Sınıf Seviyesi</label>
                                <Select
                                    value={formGrade.toString()}
                                    onValueChange={(v) => setFormGrade(parseInt(v, 10) as 5 | 6 | 7 | 8)}
                                >
                                    <SelectTrigger className={cn(
                                        "h-9 rounded-xl font-bold border",
                                        ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                                    )}>
                                        <SelectValue placeholder="Sınıf Seç" />
                                    </SelectTrigger>
                                    <SelectContent className={ambianceTheme === 'dark' ? "bg-slate-900 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900 shadow-xl"}>
                                        <SelectItem value="5">5. Sınıf</SelectItem>
                                        <SelectItem value="6">6. Sınıf</SelectItem>
                                        <SelectItem value="7">7. Sınıf</SelectItem>
                                        <SelectItem value="8">8. Sınıf</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <label className={cn("font-bold block", ambianceTheme === 'dark' ? "text-slate-300" : "text-slate-700")}>Kitap Sayfa No</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={300}
                                    value={formPageNumber}
                                    onChange={(e) => setFormPageNumber(parseInt(e.target.value, 10) || 1)}
                                    className={cn(
                                        "h-9 rounded-xl font-bold border",
                                        ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Başlık & Sûre Bilgisi */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className={cn("font-bold block", ambianceTheme === 'dark' ? "text-slate-300" : "text-slate-700")}>Sayfa Başlığı</label>
                                <Input
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="örn: 5. Sınıf Okuma Sayfası 1 - Fâtiha Sûresi"
                                    className={cn(
                                        "h-9 rounded-xl font-medium border",
                                        ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                                    )}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className={cn("font-bold block", ambianceTheme === 'dark' ? "text-slate-300" : "text-slate-700")}>Sûre &amp; Âyet Bilgisi</label>
                                <Input
                                    value={formSurahInfo}
                                    onChange={(e) => setFormSurahInfo(e.target.value)}
                                    placeholder="örn: Fâtiha Sûresi, 1-7. Âyetler"
                                    className={cn(
                                        "h-9 rounded-xl font-medium border",
                                        ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Açıklama */}
                        <div className="space-y-1.5">
                            <label className={cn("font-bold block", ambianceTheme === 'dark' ? "text-slate-300" : "text-slate-700")}>Açıklama / Kazanım Notu</label>
                            <Input
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="örn: 5. Sınıf MEB Ders Kitabı Sayfa 14 Okuma Parçası"
                                className={cn(
                                    "h-9 rounded-xl font-medium border",
                                    ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                                )}
                            />
                        </div>

                        {/* Görsel Yolu / Linki */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className={cn("font-bold flex items-center gap-1.5", ambianceTheme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                                    <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Görsel Yolu veya Web Linki</span>
                                </label>
                                <span className={cn("text-[10px] font-mono", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-500")}>public/kuran/5/sayfa1.jpg veya https://...</span>
                            </div>
                            <Input
                                value={formImageSrc}
                                onChange={(e) => setFormImageSrc(e.target.value)}
                                placeholder="/kuran/5/sayfa1.jpg"
                                className={cn(
                                    "h-9 rounded-xl font-mono text-xs border",
                                    ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-white" : "bg-white border-slate-300 text-slate-900"
                                )}
                            />
                        </div>

                        {/* Arapça Toplu Metin & Âyetlere Otomatik Bölme */}
                        <div className={cn("space-y-1.5 pt-2 border-t", ambianceTheme === 'dark' ? "border-white/10" : "border-slate-200")}>
                            <div className="flex items-center justify-between">
                                <label className={cn("font-bold flex items-center gap-1.5", ambianceTheme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Arapça Metin (Toplu Yapıştırın)</span>
                                </label>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleAutoSplitAyahs}
                                    className="h-7 px-2.5 rounded-lg font-bold text-[11px] bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer"
                                    title="Metni satırlara veya âyet sonlarına göre ayırıp aşağıdaki âyet listesine doldurur"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    <span>Âyetlere Otomatik Böl</span>
                                </Button>
                            </div>
                            <Textarea
                                dir="rtl"
                                rows={3}
                                value={formArabicPreview}
                                onChange={(e) => setFormArabicPreview(e.target.value)}
                                placeholder="بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ..."
                                className={cn(
                                    "rounded-xl font-serif text-base leading-loose border",
                                    ambianceTheme === 'dark' ? "bg-white/8 border-white/15 text-amber-200" : "bg-amber-50/50 border-amber-200 text-amber-950"
                                )}
                            />
                        </div>

                        {/* Âyet Listesi Editörü */}
                        <div className={cn("space-y-2 pt-2 border-t", ambianceTheme === 'dark' ? "border-white/10" : "border-slate-200")}>
                            <div className="flex items-center justify-between">
                                <label className={cn("font-bold", ambianceTheme === 'dark' ? "text-slate-300" : "text-slate-700")}>
                                    Okuma Bölümleri &amp; Âyetler ({formAyahs.length})
                                </label>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddEmptyAyah}
                                    className={cn(
                                        "h-7 px-2.5 rounded-lg font-bold text-[11px] border cursor-pointer",
                                        ambianceTheme === 'dark' ? "border-white/15 text-purple-300 hover:bg-white/10" : "border-purple-300 text-purple-700 hover:bg-purple-50"
                                    )}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Yeni Satır Ekle
                                </Button>
                            </div>

                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                {formAyahs.length === 0 ? (
                                    <div className={cn("text-center py-6 text-xs italic", ambianceTheme === 'dark' ? "text-slate-500" : "text-slate-600 font-medium")}>
                                        Henüz âyet ayrıştırılmadı. Yukarıdaki alana Arapça metni yapıştırıp &quot;Âyetlere Otomatik Böl&quot;e tıklayabilirsiniz.
                                    </div>
                                ) : (
                                    formAyahs.map((ayah, i) => (
                                        <div key={i} className={cn(
                                            "flex items-center gap-2 p-2 rounded-xl border",
                                            ambianceTheme === 'dark' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                                        )}>
                                            <Badge className="bg-purple-600/30 text-purple-300 font-mono text-[10px] shrink-0 border-0">
                                                #{ayah.number}
                                            </Badge>
                                            <Input
                                                dir="rtl"
                                                value={ayah.arabic}
                                                onChange={(e) => handleUpdateAyahText(i, e.target.value)}
                                                className={cn(
                                                    "h-8 text-sm font-serif flex-1 border",
                                                    ambianceTheme === 'dark' ? "bg-white/8 border-white/10 text-amber-200" : "bg-white border-slate-300 text-amber-950 font-bold"
                                                )}
                                            />
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => handleRemoveAyah(i)}
                                                className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer shrink-0"
                                                title="Bu âyeti kaldır"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className={cn("gap-2 sm:gap-0 pt-2 border-t", ambianceTheme === 'dark' ? "border-white/10" : "border-slate-200")}>
                        <Button
                            variant="ghost"
                            onClick={() => setIsPageDialogOpen(false)}
                            className={cn("rounded-xl font-bold text-xs cursor-pointer", ambianceTheme === 'dark' ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")}
                            disabled={isSavingPage}
                        >
                            Vazgeç
                        </Button>
                        <Button
                            onClick={handleSavePage}
                            disabled={isSavingPage}
                            className="rounded-xl font-black text-xs bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-lg cursor-pointer"
                        >
                            {isSavingPage ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
                            <span>{editingPageId ? 'Değişiklikleri Kaydet' : 'Sayfayı Ekle'}</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ──────────────────────────────────────────────────────────── */}
            {/* 8. SAYFA SİLME ONAY MODALI */}
            {/* ──────────────────────────────────────────────────────────── */}
            <Dialog open={!!pageToDelete} onOpenChange={(open) => !open && setPageToDelete(null)}>
                <DialogContent className={cn(
                    "max-w-md p-6 rounded-3xl border shadow-2xl",
                    ambianceTheme === 'dark' ? "bg-slate-950 border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
                )}>
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black flex items-center gap-2 text-rose-500">
                            <Trash2 className="w-5 h-5" />
                            <span>Okuma Sayfasını Sil</span>
                        </DialogTitle>
                        <DialogDescription className={cn("text-xs pt-1", ambianceTheme === 'dark' ? "text-slate-400" : "text-slate-600 font-medium")}>
                            {pageToDelete && (
                                <>
                                    <strong className={ambianceTheme === 'dark' ? "text-white" : "text-slate-900"}>
                                        {pageToDelete.grade}. Sınıf Sayfa {pageToDelete.pageNumber} ({pageToDelete.title})
                                    </strong>{' '}
                                    adlı okuma sayfasını kaldırmak istediğinize emin misiniz?
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className={cn(
                        "p-3 rounded-2xl border text-xs leading-relaxed my-2",
                        ambianceTheme === 'dark' ? "bg-rose-950/30 border-rose-500/20 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-900 font-medium"
                    )}>
                        Bu işlem sayfayı müfredat listesinden kaldırır. Öğrencilerin daha önce bu sayfa için almış olduğu puan kayıtları veritabanında korunmaya devam eder.
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setPageToDelete(null)}
                            className={cn("rounded-xl font-bold text-xs cursor-pointer", ambianceTheme === 'dark' ? "text-slate-300 hover:text-white hover:bg-white/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")}
                            disabled={isDeletingPage}
                        >
                            İptal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDeletePage}
                            disabled={isDeletingPage}
                            className="rounded-xl font-black text-xs cursor-pointer bg-rose-600 hover:bg-rose-500 text-white"
                        >
                            {isDeletingPage ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
                            <span>Sayfayı Sil</span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
