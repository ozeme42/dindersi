'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
    BookOpen, Search, Filter, Home, ArrowLeft, PlusCircle, 
    FilePenLine, Trash2, Copy, Check, Eye, Sparkles, 
    Loader2, BookMarked, Layers, FileText, AlertCircle, 
    ChevronRight, ChevronLeft, X, ExternalLink, RefreshCw, ArrowUpDown, 
    ClipboardPaste, Eraser, CheckCircle2, Type, GraduationCap,
    RotateCcw, FilterX, Book, Maximize2, Bookmark, FileUp, Wand2
} from 'lucide-react';
import { collectionGroup, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription, 
    DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, 
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
    Select, SelectContent, SelectItem, 
    SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { saveTopicSourceText, clearTopicSourceText } from './actions';
import { cn } from '@/lib/utils';
import { loadPdf, extractTextFromPageRange } from '@/lib/pdf-text-extractor';

interface TopicItem {
    id: string;
    courseId: string;
    unitId: string;
    topicId: string;
    title: string;
    sourceText: string;
    className: string;
    grade: string;
    unitTitle: string;
    courseTitle: string;
    wordCount: number;
    charCount: number;
}

const formatCourseTitle = (title: string): string => {
    if (!title) return '';
    const lower = title.toLocaleLowerCase('tr').trim();
    if (lower === 'dkab' || lower.includes('dkab') || lower === 'din' || lower.includes('din kültürü')) {
        return 'Din Kültürü ve Ahlak Bilgisi';
    }
    if (lower === 'siyer' || lower.includes('siyer') || lower.includes('peygamber')) {
        return 'Peygamberimizin Hayatı';
    }
    if (lower.includes('kuran') || lower.includes('kur’an') || lower.includes('kur-an')) {
        return "Kur'an-ı Kerim";
    }
    if (lower.includes('temel dini')) {
        return 'Temel Dini Bilgiler';
    }
    return title;
};

export default function SourceTextsManagementPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [topics, setTopics] = useState<TopicItem[]>([]);
    
    // Filters & Search (Strictly hierarchical: Grade -> Course -> Unit -> Topic, NO 'all' option)
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrade, setSelectedGrade] = useState<string>('5');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [selectedTopicId, setSelectedTopicId] = useState<string>('');
    const [sortBy, setSortBy] = useState<'order' | 'word_desc' | 'word_asc' | 'title'>('order');

    // Miller Columns Focus & Animation State (açılan sol tarafa doğru küçülsün)
    const [focusedColumn, setFocusedColumn] = useState<'grade' | 'course' | 'unit' | 'topic'>('topic');

    // Inline Digital Book Reader & Editor State
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [inlineEditText, setInlineEditText] = useState('');

    // Modals
    const [readingTopic, setReadingTopic] = useState<TopicItem | null>(null);
    const [editingTopic, setEditingTopic] = useState<TopicItem | null>(null);
    const [editText, setEditText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [readerFontSize, setReaderFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

    // PDF Assistant State (Sıfır Hata Sayfa Bazlı Metin Çıkarıcı)
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pdfFileName, setPdfFileName] = useState<string>('');
    const [pdfTotalPages, setPdfTotalPages] = useState<number>(0);
    const [pdfStartPage, setPdfStartPage] = useState<number | string>(1);
    const [pdfEndPage, setPdfEndPage] = useState<number | string>(1);
    const [isExtractingPdf, setIsExtractingPdf] = useState(false);
    const [pdfExtractProgress, setPdfExtractProgress] = useState<string>('');
    const pdfFileInputRef = useRef<HTMLInputElement>(null);

    // Load Data
    const loadData = async (showRefreshToast = false) => {
        setIsLoading(true);
        try {
            const res = await fetch('/curriculum/manifest.json');
            let manifest: any = { classGroups: [] };
            if (res.ok) {
                manifest = await res.json();
            }

            const topicMetaMap = new Map<string, {
                courseId: string;
                unitId: string;
                className: string;
                grade: string;
                courseTitle: string;
                unitTitle: string;
                topicTitle: string;
            }>();

            for (const cg of manifest.classGroups || []) {
                const grade = cg.name;
                const className = `${grade}. Sınıf`;
                for (const course of cg.courses || []) {
                    const fullCourseTitle = formatCourseTitle(course.title);
                    for (const unit of course.units || []) {
                        for (const topic of unit.topics || []) {
                            topicMetaMap.set(topic.id, {
                                courseId: course.id,
                                unitId: unit.id,
                                className,
                                grade,
                                courseTitle: fullCourseTitle,
                                unitTitle: unit.title,
                                topicTitle: topic.title
                            });
                        }
                    }
                }
            }

            const snapshot = await getDocs(query(collectionGroup(db, 'topics')));
            const firestoreTopicsMap = new Map<string, any>();
            snapshot.forEach(docSnap => {
                firestoreTopicsMap.set(docSnap.id, {
                    data: docSnap.data(),
                    path: docSnap.ref.path
                });
            });

            const topicList: TopicItem[] = [];
            const seenTopicIds = new Set<string>();

            // 1. Önce manifest sırasına göre tüm konuları ekle (doğal müfredat sıralaması)
            for (const cg of manifest.classGroups || []) {
                const grade = cg.name;
                const className = `${grade}. Sınıf`;
                for (const course of cg.courses || []) {
                    const fullCourseTitle = formatCourseTitle(course.title);
                    for (const unit of course.units || []) {
                        for (const topic of unit.topics || []) {
                            seenTopicIds.add(topic.id);
                            const firestoreDoc = firestoreTopicsMap.get(topic.id);
                            const sourceText = ((firestoreDoc?.data?.sourceText ?? topic.sourceText) || '').trim();
                            const wordCount = sourceText ? sourceText.split(/\s+/).filter(Boolean).length : 0;
                            const charCount = sourceText.length;

                            topicList.push({
                                id: topic.id,
                                topicId: topic.id,
                                courseId: course.id,
                                unitId: unit.id,
                                title: topic.title,
                                sourceText,
                                className,
                                grade,
                                unitTitle: unit.title,
                                courseTitle: fullCourseTitle,
                                wordCount,
                                charCount
                            });
                        }
                    }
                }
            }

            // 2. Firestore'da olup manifest'te bulunmayan ek konular varsa sadece geçerli meta bilgisi olanları ekle
            firestoreTopicsMap.forEach((val, topicId) => {
                if (!seenTopicIds.has(topicId)) {
                    const meta = topicMetaMap.get(topicId);
                    if (!meta) return; // Yetim veya silinmiş derslere ait konuları fihriste ekleme
                    const d = val.data;
                    const sourceText = (d.sourceText || '').trim();
                    const wordCount = sourceText ? sourceText.split(/\s+/).filter(Boolean).length : 0;
                    const charCount = sourceText.length;

                    topicList.push({
                        id: topicId,
                        topicId,
                        courseId: meta.courseId,
                        unitId: meta.unitId,
                        title: d.title || meta.topicTitle || 'İsimsiz Konu',
                        sourceText,
                        className: meta.className,
                        grade: meta.grade,
                        unitTitle: meta.unitTitle,
                        courseTitle: meta.courseTitle,
                        wordCount,
                        charCount
                    });
                }
            });

            setTopics(topicList);
            if (showRefreshToast) {
                toast({ title: "Başarılı", description: "Kaynak metinler veritabanından güncellendi." });
            }
        } catch (error: any) {
            console.error("Error loading source texts:", error);
            toast({ title: "Hata", description: "Kaynak metinler yüklenemedi: " + error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Statistics
    const stats = useMemo(() => {
        const total = topics.length;
        const withText = topics.filter(t => t.sourceText.length > 0).length;
        const withoutText = total - withText;
        const totalWords = topics.reduce((acc, t) => acc + t.wordCount, 0);
        return { total, withText, withoutText, totalWords };
    }, [topics]);

    // Available Grades (e.g. ['5', '6', '7', '8'])
    const availableGrades = useMemo(() => {
        const grades = new Set<string>();
        topics.forEach(t => {
            if (t.grade) grades.add(t.grade);
        });
        return Array.from(grades).sort((a, b) => Number(a) - Number(b));
    }, [topics]);

    // Available Courses for selectedGrade (NO 'all')
    const availableCourses = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        topics.forEach(t => {
            if (t.grade !== selectedGrade) return;
            if (!t.courseId) return;
            const fullTitle = formatCourseTitle(t.courseTitle || 'Ders');
            const existing = map.get(t.courseId);
            if (existing) {
                existing.count++;
            } else {
                map.set(t.courseId, {
                    id: t.courseId,
                    title: fullTitle,
                    count: 1
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    }, [topics, selectedGrade]);

    // Available Units for selectedGrade and selectedCourseId (NO 'all')
    const availableUnits = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        topics.forEach(t => {
            if (t.grade !== selectedGrade) return;
            if (t.courseId !== selectedCourseId) return;
            if (!t.unitId) return;
            const existing = map.get(t.unitId);
            if (existing) {
                existing.count++;
            } else {
                map.set(t.unitId, {
                    id: t.unitId,
                    title: t.unitTitle || 'Ünite',
                    count: 1
                });
            }
        });
        return Array.from(map.values());
    }, [topics, selectedGrade, selectedCourseId]);

    // Available Topics for selectedGrade, selectedCourseId and selectedUnitId (NO 'all')
    const availableTopics = useMemo(() => {
        return topics.filter(t => 
            t.grade === selectedGrade && 
            t.courseId === selectedCourseId && 
            t.unitId === selectedUnitId
        );
    }, [topics, selectedGrade, selectedCourseId, selectedUnitId]);

    // Auto-select valid items on initial load or change
    useEffect(() => {
        if (topics.length === 0) return;

        // 1. Sınıf kontrolü
        let currentGrade = selectedGrade;
        if (!currentGrade || !availableGrades.includes(currentGrade)) {
            currentGrade = availableGrades[0] || '5';
            setSelectedGrade(currentGrade);
        }

        // 2. Ders kontrolü
        const gradeTopics = topics.filter(t => t.grade === currentGrade);
        const validCourseIds = Array.from(new Set(gradeTopics.map(t => t.courseId)));
        let currentCourse = selectedCourseId;
        if (!currentCourse || !validCourseIds.includes(currentCourse)) {
            currentCourse = validCourseIds[0] || '';
            setSelectedCourseId(currentCourse);
        }

        // 3. Ünite kontrolü
        const courseTopics = gradeTopics.filter(t => t.courseId === currentCourse);
        const validUnitIds = Array.from(new Set(courseTopics.map(t => t.unitId)));
        let currentUnit = selectedUnitId;
        if (!currentUnit || !validUnitIds.includes(currentUnit)) {
            currentUnit = validUnitIds[0] || '';
            setSelectedUnitId(currentUnit);
        }

        // 4. Konu kontrolü
        const unitTopics = courseTopics.filter(t => t.unitId === currentUnit);
        const validTopicIds = unitTopics.map(t => t.topicId);
        let currentTopic = selectedTopicId;
        if (!currentTopic || !validTopicIds.includes(currentTopic)) {
            currentTopic = validTopicIds[0] || '';
            setSelectedTopicId(currentTopic);
        }
    }, [topics, availableGrades, selectedGrade, selectedCourseId, selectedUnitId, selectedTopicId]);

    // Cascading Handlers (Strictly single selection, NO 'all' option with Miller Column focus)
    const handleGradeChange = (grade: string) => {
        setSelectedGrade(grade);
        const gradeTopics = topics.filter(t => t.grade === grade);
        const firstCourse = gradeTopics[0]?.courseId || '';
        setSelectedCourseId(firstCourse);

        const courseTopics = gradeTopics.filter(t => t.courseId === firstCourse);
        const firstUnit = courseTopics[0]?.unitId || '';
        setSelectedUnitId(firstUnit);

        const unitTopics = courseTopics.filter(t => t.unitId === firstUnit);
        const firstTopic = unitTopics[0]?.topicId || '';
        setSelectedTopicId(firstTopic);
        setIsInlineEditing(false);
        setFocusedColumn('course');
    };

    const handleCourseChange = (courseId: string) => {
        setSelectedCourseId(courseId);
        const courseTopics = topics.filter(t => t.grade === selectedGrade && t.courseId === courseId);
        const firstUnit = courseTopics[0]?.unitId || '';
        setSelectedUnitId(firstUnit);

        const unitTopics = courseTopics.filter(t => t.unitId === firstUnit);
        const firstTopic = unitTopics[0]?.topicId || '';
        setSelectedTopicId(firstTopic);
        setIsInlineEditing(false);
        setFocusedColumn('unit');
    };

    const handleUnitChange = (unitId: string) => {
        setSelectedUnitId(unitId);
        const unitTopics = topics.filter(t => t.grade === selectedGrade && t.courseId === selectedCourseId && t.unitId === unitId);
        const firstTopic = unitTopics[0]?.topicId || '';
        setSelectedTopicId(firstTopic);
        setIsInlineEditing(false);
        setFocusedColumn('topic');
    };

    const handleTopicChange = (topicId: string) => {
        setSelectedTopicId(topicId);
        setIsInlineEditing(false);
        const chosen = topics.find(t => t.topicId === topicId);
        if (chosen) {
            setInlineEditText(chosen.sourceText || '');
        }
        setFocusedColumn('topic');
    };

    // Active Selection Names
    const activeSelectedCourse = useMemo(() => {
        return availableCourses.find(c => c.id === selectedCourseId)?.title || 'Ders';
    }, [availableCourses, selectedCourseId]);

    const activeSelectedUnit = useMemo(() => {
        return availableUnits.find(u => u.id === selectedUnitId)?.title || 'Ünite';
    }, [availableUnits, selectedUnitId]);

    const activeSelectedTopic = useMemo(() => {
        return availableTopics.find(t => t.topicId === selectedTopicId) || availableTopics[0] || null;
    }, [availableTopics, selectedTopicId]);

    // Keep inline edit text in sync with active topic
    useEffect(() => {
        if (activeSelectedTopic && !isInlineEditing) {
            setInlineEditText(activeSelectedTopic.sourceText || '');
        }
    }, [activeSelectedTopic?.id, activeSelectedTopic?.sourceText, isInlineEditing]);

    // Previous & Next Topic within unit
    const currentTopicIndex = useMemo(() => {
        return availableTopics.findIndex(t => t.topicId === selectedTopicId);
    }, [availableTopics, selectedTopicId]);

    const prevTopic = currentTopicIndex > 0 ? availableTopics[currentTopicIndex - 1] : null;
    const nextTopic = currentTopicIndex >= 0 && currentTopicIndex < availableTopics.length - 1 ? availableTopics[currentTopicIndex + 1] : null;

    const handlePrevTopic = () => {
        if (prevTopic) {
            handleTopicChange(prevTopic.topicId);
        }
    };

    const handleNextTopic = () => {
        if (nextTopic) {
            handleTopicChange(nextTopic.topicId);
        }
    };

    // Global Search Matches for instant jump
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return topics.filter(t => 
            (t.title || '').toLowerCase().includes(q) ||
            (t.unitTitle || '').toLowerCase().includes(q) ||
            (t.courseTitle || '').toLowerCase().includes(q) ||
            (t.className || '').toLowerCase().includes(q) ||
            (t.sourceText || '').toLowerCase().includes(q)
        ).slice(0, 10);
    }, [topics, searchQuery]);

    const handleSelectSearchResult = (topic: TopicItem) => {
        setSelectedGrade(topic.grade);
        setSelectedCourseId(topic.courseId);
        setSelectedUnitId(topic.unitId);
        setSelectedTopicId(topic.topicId);
        setFocusedColumn('topic');
        setIsInlineEditing(false);
        setSearchQuery('');
    };

    // Filtered Topics (current unit topics or global search results)
    const filteredTopics = useMemo(() => {
        if (searchQuery.trim()) {
            return searchResults;
        }

        let list = availableTopics;
        if (sortBy === 'word_desc') return [...list].sort((a, b) => b.wordCount - a.wordCount);
        if (sortBy === 'word_asc') return [...list].sort((a, b) => a.wordCount - b.wordCount);
        if (sortBy === 'title') return [...list].sort((a, b) => a.title.localeCompare(b.title, 'tr'));
        return list;
    }, [availableTopics, searchQuery, searchResults, sortBy]);

    // Inline Save Action
    const handleSaveInlineEdit = async () => {
        if (!activeSelectedTopic) return;
        setIsSaving(true);
        try {
            const res = await saveTopicSourceText(
                activeSelectedTopic.courseId,
                activeSelectedTopic.unitId,
                activeSelectedTopic.topicId,
                inlineEditText
            );

            if (res.success) {
                const trimmed = inlineEditText.trim();
                const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
                const charCount = trimmed.length;

                setTopics(prev => prev.map(t => {
                    if (t.id === activeSelectedTopic.id) {
                        return {
                            ...t,
                            sourceText: trimmed,
                            wordCount,
                            charCount
                        };
                    }
                    return t;
                }));

                toast({ title: "Kayıt Başarılı", description: `${activeSelectedTopic.title} için kaynak metin güncellendi.` });
                setIsInlineEditing(false);
            } else {
                toast({ title: "Kayıt Hatası", description: res.error || "Metin kaydedilemedi.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Hata", description: error.message || "İşlem sırasında hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Copy action
    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast({ title: "Kopyalandı", description: "Kaynak metin panoya kopyalandı." });
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            toast({ title: "Hata", description: "Panoya kopyalanamadı.", variant: "destructive" });
        }
    };

    // Open Editor
    const handleOpenEdit = (topic: TopicItem) => {
        setEditingTopic(topic);
        setEditText(topic.sourceText);
    };

    // Save Editor
    const handleSaveEdit = async () => {
        if (!editingTopic) return;
        setIsSaving(true);
        try {
            const res = await saveTopicSourceText(
                editingTopic.courseId,
                editingTopic.unitId,
                editingTopic.topicId,
                editText
            );

            if (res.success) {
                const trimmed = editText.trim();
                const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
                const charCount = trimmed.length;

                setTopics(prev => prev.map(t => {
                    if (t.id === editingTopic.id) {
                        return {
                            ...t,
                            sourceText: trimmed,
                            wordCount,
                            charCount
                        };
                    }
                    return t;
                }));

                toast({ title: "Kayıt Başarılı", description: `${editingTopic.title} için kaynak metin güncellendi.` });
                setEditingTopic(null);
            } else {
                toast({ title: "Kayıt Hatası", description: res.error || "Metin kaydedilemedi.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Hata", description: error.message || "İşlem sırasında hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Clear / Delete Action
    const handleClearText = async (topic: TopicItem) => {
        try {
            const res = await clearTopicSourceText(topic.courseId, topic.unitId, topic.topicId);
            if (res.success) {
                setTopics(prev => prev.map(t => {
                    if (t.id === topic.id) {
                        return {
                            ...t,
                            sourceText: '',
                            wordCount: 0,
                            charCount: 0
                        };
                    }
                    return t;
                }));
                toast({ title: "Silindi", description: `${topic.title} kaynak metni temizlendi.` });
            } else {
                toast({ title: "Hata", description: res.error || "Metin silinemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        }
    };

    // PDF Handlers (Sıfır Hata Sayfa Bazlı Metin Çıkarıcı)
    const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            toast({ title: "PDF Açılıyor...", description: `${file.name} taranıyor, lütfen bekleyin.` });
            const { pdfDoc: doc, numPages, title } = await loadPdf(file);
            setPdfDoc(doc);
            setPdfFileName(title);
            setPdfTotalPages(numPages);
            setPdfStartPage(1);
            setPdfEndPage(Math.min(5, numPages));
            toast({ 
                title: "PDF Hazır! 🎉", 
                description: `${title} yüklendi. Toplam ${numPages} sayfa. Şimdi istediğiniz sayfa aralığını seçip tek tıkla aktarabilirsiniz.` 
            });
        } catch (err: any) {
            console.error("PDF load error:", err);
            toast({ title: "PDF Hatası", description: err.message || "PDF açılamadı.", variant: "destructive" });
        } finally {
            if (pdfFileInputRef.current) {
                pdfFileInputRef.current.value = '';
            }
        }
    };

    const handleExtractPdfPages = async (mode: 'replace' | 'append' = 'replace') => {
        if (!pdfDoc) {
            pdfFileInputRef.current?.click();
            return;
        }

        const start = Number(pdfStartPage);
        const end = Number(pdfEndPage);

        if (!start || !end || start < 1 || end < start) {
            toast({ title: "Geçersiz Sayfa Aralığı", description: "Lütfen geçerli bir başlangıç ve bitiş sayfası girin.", variant: "destructive" });
            return;
        }

        if (end > pdfTotalPages) {
            toast({ title: "Sayfa Sınırı Aşıldı", description: `PDF toplam ${pdfTotalPages} sayfadır.`, variant: "destructive" });
            return;
        }

        setIsExtractingPdf(true);
        setPdfExtractProgress(`${start}. sayfa okunuyor...`);

        try {
            const { fullText, totalWords, pages } = await extractTextFromPageRange(
                pdfDoc, 
                start, 
                end,
                (current, total) => setPdfExtractProgress(`${current} / ${total} sayfa`)
            );

            if (!fullText.trim()) {
                toast({ title: "Metin Bulunamadı", description: "Seçilen sayfalarda okunabilir metin katmanı bulunamadı (Taranmış resim olabilir).", variant: "destructive" });
                return;
            }

            if (mode === 'append' && inlineEditText.trim()) {
                setInlineEditText(prev => prev.trim() + '\n\n' + fullText.trim());
            } else {
                setInlineEditText(fullText.trim());
            }

            // Otomatik düzenleme moduna geç
            setIsInlineEditing(true);

            // Bir sonraki konu için başlangıç sayfasını otomatik hazırla
            if (end < pdfTotalPages) {
                const nextStart = end + 1;
                setPdfStartPage(nextStart);
                setPdfEndPage(Math.min(nextStart + 3, pdfTotalPages));
            }

            toast({
                title: "Metin Başarıyla Aktarıldı! ⚡",
                description: `${pages.length} sayfa (${start} - ${end}) eksiksiz aktarıldı. (${totalWords.toLocaleString('tr-TR')} kelime)`
            });
        } catch (err: any) {
            console.error("PDF extract error:", err);
            toast({ title: "Hata", description: "Metin çıkarılırken bir hata oluştu: " + err.message, variant: "destructive" });
        } finally {
            setIsExtractingPdf(false);
            setPdfExtractProgress('');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 px-2 sm:px-4 md:px-6 py-4 md:py-6 relative overflow-x-hidden">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[900px] h-[900px] bg-indigo-900/15 rounded-full blur-[160px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-emerald-900/15 rounded-full blur-[160px]" />
            </div>

            <div className="w-full relative z-10 space-y-6">
                
                {/* ══ ÜST GEZİNME VE BUTONLAR ══ */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-900/60 backdrop-blur-md rounded-xl h-11 px-5 shadow-lg">
                            <Link href="/">
                                <Home className="mr-2 h-5 w-5 text-indigo-400" /> Ana Sayfa
                            </Link>
                        </Button>
                        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl h-11 px-4">
                            <Link href="/teacher">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Öğretmen Paneli
                            </Link>
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Gizli PDF Dosya Seçici */}
                        <input 
                            type="file" 
                            ref={pdfFileInputRef} 
                            accept="application/pdf" 
                            className="hidden" 
                            onChange={handlePdfFileSelect} 
                        />

                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => pdfFileInputRef.current?.click()}
                            className={cn(
                                "rounded-xl h-11 px-4 font-bold text-xs transition-all shadow-lg flex items-center gap-2",
                                pdfDoc 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20" 
                                    : "bg-indigo-600/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/25 hover:text-white"
                            )}
                        >
                            <FileUp className="h-4 w-4 text-indigo-400" />
                            {pdfDoc ? (
                                <span className="truncate max-w-[150px] sm:max-w-[220px]" title={pdfFileName}>
                                    📗 {pdfFileName} ({pdfTotalPages} sf)
                                </span>
                            ) : (
                                "Ders Kitabı PDF'i Yükle"
                            )}
                        </Button>

                        <Button 
                            variant="outline" 
                            size="sm"
                            disabled={isRefreshing || isLoading}
                            onClick={() => { setIsRefreshing(true); loadData(true); }}
                            className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-11 px-4"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin text-indigo-400")} />
                            Yenile
                        </Button>
                    </div>
                </div>

                {/* ══ BAŞLIK VE AÇIKLAMA ══ */}
                <div className="text-center space-y-4 py-4">
                    <div className="inline-flex items-center justify-center p-4 bg-slate-900 border border-indigo-500/20 rounded-3xl shadow-2xl shadow-indigo-950/50 mb-1">
                        <BookOpen className="h-10 w-10 text-indigo-400" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-lg flex items-center justify-center gap-3">
                        Kaynak Metin Kütüphanesi
                        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-bold px-3 py-1">
                            MERKEZİ VERİ TABANI
                        </Badge>
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto font-medium">
                        Sunumlar, soru bankası sihirbazı ve etkinlik veri bankasında kullanılan tüm ders kitabı ve konu kaynak metinlerini tek bir yerden görüntüleyin, düzenleyin ve yönetin.
                    </p>
                </div>

                {/* ══ İSTATİSTİK KARTLARI ══ */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Toplam Konu</p>
                            <p className="text-2xl font-black text-white">{stats.total}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">Metni Olanlar</p>
                            <p className="text-2xl font-black text-emerald-400">{stats.withText}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">Metin Bekleyen</p>
                            <p className="text-2xl font-black text-amber-400">{stats.withoutText}</p>
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900/60 border border-indigo-500/20 backdrop-blur-md shadow-xl flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                            <Type className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Toplam Kelime</p>
                            <p className="text-2xl font-black text-indigo-400">{stats.totalWords.toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </div>

                {/* ══ HIZLI ARAMA VE MÜFREDAT KİTAP GEZGİNİ ══ */}
                <div className="space-y-4">
                    
                    {/* Hızlı Arama & Filtre Çubuğu */}
                    <div className="relative z-30">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Kitap içinde ara... (Konu adı, ünite, ders veya metin içeriği)"
                                className="pl-12 pr-10 h-13 bg-slate-900/90 border-white/10 text-base text-white placeholder:text-slate-500 rounded-2xl shadow-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-xl"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                    title="Aramayı temizle"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Canlı Arama Sonuçları Açılır Menüsü */}
                        {searchQuery.trim().length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl max-h-80 overflow-y-auto p-2 space-y-1 z-50 divide-y divide-white/5">
                                <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                    <span>Arama Sonuçları ({searchResults.length})</span>
                                    <span className="text-slate-500 font-normal">Tıklayarak doğrudan kitaba gidin</span>
                                </div>
                                {searchResults.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-slate-400">
                                        "{searchQuery}" ile eşleşen kaynak metin bulunamadı.
                                    </div>
                                ) : (
                                    searchResults.map(topic => (
                                        <button
                                            key={topic.id}
                                            onClick={() => handleSelectSearchResult(topic)}
                                            className="w-full text-left p-3 rounded-xl hover:bg-slate-800/80 transition-all flex items-center justify-between gap-3 group"
                                        >
                                            <div className="space-y-1 truncate">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                                                        {topic.className}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/30">
                                                        {topic.courseTitle}
                                                    </Badge>
                                                    <span className="text-[11px] text-slate-400 truncate">{topic.unitTitle}</span>
                                                </div>
                                                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                                                    {topic.title}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {topic.sourceText ? (
                                                    <span className="text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                        {topic.wordCount} k.
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                                                        Metin Yok
                                                    </span>
                                                )}
                                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* ══ MILLER COLUMNS KİTAP GEZGİNİ & DİJİTAL KİTAP OKUYUCU ══ */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 2xl:gap-6 items-start w-full">
                        
                        {/* ── SOL BÖLÜM: KADEMELİ KİTAP FİHRİSTİ (MILLER COLUMNS) ── */}
                        <div className="xl:col-span-5 2xl:col-span-5 flex flex-col h-[780px] xl:h-[820px] rounded-3xl bg-slate-900/75 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
                            {/* Fihrist Üst Başlık Barı */}
                            <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Book className="w-5 h-5 text-indigo-400" />
                                    <span className="font-bold text-sm text-white">Kitap İçeriği & Fihrist</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                                    <button 
                                        onClick={() => setFocusedColumn('grade')}
                                        className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'grade' ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white")}
                                    >
                                        Sınıf
                                    </button>
                                    <span>›</span>
                                    <button 
                                        onClick={() => setFocusedColumn('course')}
                                        className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'course' ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white")}
                                    >
                                        Ders
                                    </button>
                                    <span>›</span>
                                    <button 
                                        onClick={() => setFocusedColumn('unit')}
                                        className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'unit' ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white")}
                                    >
                                        Ünite
                                    </button>
                                    <span>›</span>
                                    <button 
                                        onClick={() => setFocusedColumn('topic')}
                                        className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'topic' ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white")}
                                    >
                                        Konu
                                    </button>
                                </div>
                            </div>

                            {/* 4 Kademeli Kolon Konteyneri */}
                            <div className="flex flex-1 flex-row overflow-x-auto overflow-y-hidden divide-x divide-white/10 select-none">
                                
                                {/* ── KOLON 1: SINIFLAR ── */}
                                {focusedColumn === 'grade' ? (
                                    <div className="flex-1 min-w-[200px] bg-slate-900/40 flex flex-col transition-all duration-300">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap className="w-4 h-4 text-indigo-400" />
                                                <span className="text-xs font-bold text-slate-200">Sınıf Seviyesi</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500">{availableGrades.length} Seviye</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
                                            {availableGrades.map(grade => {
                                                const isSelected = selectedGrade === grade;
                                                const count = topics.filter(t => t.grade === grade).length;
                                                return (
                                                    <button
                                                        key={grade}
                                                        onClick={() => {
                                                            handleGradeChange(grade);
                                                            setFocusedColumn('course');
                                                        }}
                                                        className={cn(
                                                            "w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between group",
                                                            isSelected
                                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold"
                                                                : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm", isSelected ? "bg-indigo-700 text-white" : "bg-white/5 text-indigo-400")}>
                                                                {grade}
                                                            </div>
                                                            <span>{grade}. Sınıf</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={cn("text-xs font-mono px-2 py-0.5 rounded-lg", isSelected ? "bg-indigo-700/80 text-white" : "bg-white/5 text-slate-400")}>
                                                                {count}
                                                            </span>
                                                            <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", isSelected ? "text-white" : "text-slate-600")} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => setFocusedColumn('grade')}
                                        title="Sınıfları genişletmek için tıklayın"
                                        className="w-14 sm:w-16 flex-shrink-0 bg-slate-950/70 hover:bg-slate-900/90 transition-all duration-300 flex flex-col items-center py-3 cursor-pointer group"
                                    >
                                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mb-2 group-hover:scale-110 transition-transform">
                                            <GraduationCap className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider group-hover:text-indigo-400 mb-3">
                                            Sınıf
                                        </span>
                                        <div className="flex flex-col gap-2 items-center">
                                            {availableGrades.map(grade => {
                                                const isSelected = selectedGrade === grade;
                                                return (
                                                    <button
                                                        key={grade}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleGradeChange(grade);
                                                            setFocusedColumn('course');
                                                        }}
                                                        title={`${grade}. Sınıf`}
                                                        className={cn(
                                                            "w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center transition-all",
                                                            isSelected
                                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 ring-2 ring-indigo-400/50 scale-105"
                                                                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                                                        )}
                                                    >
                                                        {grade}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ── KOLON 2: DERSLER ── */}
                                {focusedColumn === 'course' ? (
                                    <div className="flex-1 min-w-[200px] bg-slate-900/40 flex flex-col transition-all duration-300">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-purple-400" />
                                                <span className="text-xs font-bold text-slate-200">{selectedGrade}. Sınıf Dersleri</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500">{availableCourses.length} Ders</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
                                            {availableCourses.map(course => {
                                                const isSelected = selectedCourseId === course.id;
                                                return (
                                                    <button
                                                        key={course.id}
                                                        onClick={() => {
                                                            handleCourseChange(course.id);
                                                            setFocusedColumn('unit');
                                                        }}
                                                        className={cn(
                                                            "w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between group",
                                                            isSelected
                                                                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50 font-bold"
                                                                : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                                            <BookOpen className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-white" : "text-purple-400")} />
                                                            <span className="text-xs font-semibold leading-snug break-words">{course.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            <span className={cn("text-xs font-mono px-2 py-0.5 rounded-lg", isSelected ? "bg-purple-700/80 text-white" : "bg-white/5 text-slate-400")}>
                                                                {course.count}
                                                            </span>
                                                            <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", isSelected ? "text-white" : "text-slate-600")} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => setFocusedColumn('course')}
                                        title="Dersleri genişletmek için tıklayın"
                                        className="w-28 sm:w-36 flex-shrink-0 bg-slate-950/70 hover:bg-slate-900/90 transition-all duration-300 flex flex-col items-center py-3 cursor-pointer group"
                                    >
                                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 mb-2 group-hover:scale-110 transition-transform">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider group-hover:text-purple-400 mb-3">
                                            Ders
                                        </span>
                                        <div className="flex flex-col gap-2 w-full px-2">
                                            {availableCourses.map(course => {
                                                const isSelected = selectedCourseId === course.id;
                                                return (
                                                    <button
                                                        key={course.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCourseChange(course.id);
                                                            setFocusedColumn('unit');
                                                        }}
                                                        title={course.title}
                                                        className={cn(
                                                            "w-full min-h-[44px] py-2 px-2 rounded-xl font-bold text-[10px] sm:text-[11px] leading-tight flex items-center justify-center text-center transition-all",
                                                            isSelected
                                                                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50 ring-2 ring-purple-400/50 scale-[1.02]"
                                                                : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5"
                                                        )}
                                                    >
                                                        {course.title}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ── KOLON 3: ÜNİTELER ── */}
                                {focusedColumn === 'unit' ? (
                                    <div className="flex-1 min-w-[220px] bg-slate-900/40 flex flex-col transition-all duration-300">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                                            <div className="flex items-center gap-2 truncate">
                                                <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                <span className="text-xs font-bold text-slate-200 truncate">{activeSelectedCourse} Üniteleri</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{availableUnits.length} Ünite</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
                                            {availableUnits.map(unit => {
                                                const isSelected = selectedUnitId === unit.id;
                                                return (
                                                    <button
                                                        key={unit.id}
                                                        onClick={() => {
                                                            handleUnitChange(unit.id);
                                                            setFocusedColumn('topic');
                                                        }}
                                                        className={cn(
                                                            "w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between group",
                                                            isSelected
                                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-bold"
                                                                : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2.5 truncate">
                                                            <Layers className={cn("w-4 h-4 flex-shrink-0", isSelected ? "text-white" : "text-blue-400")} />
                                                            <span className="truncate text-xs font-semibold">{unit.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            <span className={cn("text-xs font-mono px-2 py-0.5 rounded-lg", isSelected ? "bg-blue-700/80 text-white" : "bg-white/5 text-slate-400")}>
                                                                {unit.count}
                                                            </span>
                                                            <ChevronRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", isSelected ? "text-white" : "text-slate-600")} />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => setFocusedColumn('unit')}
                                        title="Üniteleri genişletmek için tıklayın"
                                        className="w-16 sm:w-20 flex-shrink-0 bg-slate-950/70 hover:bg-slate-900/90 transition-all duration-300 flex flex-col items-center py-3 cursor-pointer group"
                                    >
                                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 mb-2 group-hover:scale-110 transition-transform">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider group-hover:text-blue-400 mb-3">
                                            Ünite
                                        </span>
                                        <div className="flex flex-col gap-1.5 items-center overflow-y-auto max-h-[580px] scrollbar-none">
                                            {availableUnits.map((unit, idx) => {
                                                const isSelected = selectedUnitId === unit.id;
                                                return (
                                                    <button
                                                        key={unit.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUnitChange(unit.id);
                                                            setFocusedColumn('topic');
                                                        }}
                                                        title={unit.title}
                                                        className={cn(
                                                            "w-11 sm:w-14 h-7 rounded-lg font-bold text-[11px] flex items-center justify-center transition-all truncate px-1",
                                                            isSelected
                                                                ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400/50 scale-105"
                                                                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                                                        )}
                                                    >
                                                        {idx + 1}.Ün
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ── KOLON 4: KONULAR ── */}
                                {focusedColumn === 'topic' ? (
                                    <div className="flex-1 min-w-[240px] bg-slate-900/40 flex flex-col transition-all duration-300">
                                        <div className="p-3 border-b border-white/5 flex items-center justify-between bg-slate-950/30">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span className="text-xs font-bold text-slate-200 truncate">{activeSelectedUnit} Konuları</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{availableTopics.length} Konu</span>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
                                            {availableTopics.map((topic, idx) => {
                                                const isSelected = selectedTopicId === topic.topicId;
                                                const hasText = topic.sourceText.length > 0;
                                                return (
                                                    <button
                                                        key={topic.topicId}
                                                        onClick={() => handleTopicChange(topic.topicId)}
                                                        className={cn(
                                                            "w-full text-left p-3.5 rounded-2xl transition-all flex flex-col gap-1.5 group border",
                                                            isSelected
                                                                ? "bg-indigo-600 text-white shadow-xl shadow-indigo-950/60 border-indigo-400/60 font-bold"
                                                                : "bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border-white/5"
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span 
                                                                    className={cn(
                                                                        "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5",
                                                                        hasText ? (isSelected ? "bg-emerald-300" : "bg-emerald-400") : "bg-slate-600"
                                                                    )} 
                                                                    title={hasText ? "Kaynak metin var" : "Kaynak metin henüz yok"}
                                                                />
                                                                <span className="text-xs font-semibold line-clamp-2 leading-tight">
                                                                    {topic.title}
                                                                </span>
                                                            </div>
                                                            {isSelected && (
                                                                <ChevronRight className="w-4 h-4 flex-shrink-0 text-white" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between text-[11px] pl-4.5 pt-0.5">
                                                            <span className={cn(isSelected ? "text-indigo-200" : "text-slate-500 font-mono")}>
                                                                {idx + 1}. Konu
                                                            </span>
                                                            {hasText ? (
                                                                <span className={cn("font-mono text-[10px] px-1.5 py-0.5 rounded", isSelected ? "bg-indigo-700 text-emerald-200 font-bold" : "bg-emerald-500/10 text-emerald-400")}>
                                                                    {topic.wordCount} kelime
                                                                </span>
                                                            ) : (
                                                                <span className={cn("text-[10px]", isSelected ? "text-amber-200" : "text-amber-400/70")}>
                                                                    Metin Yok
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => setFocusedColumn('topic')}
                                        title="Konuları genişletmek için tıklayın"
                                        className="w-14 sm:w-16 flex-shrink-0 bg-slate-950/70 hover:bg-slate-900/90 transition-all duration-300 flex flex-col items-center py-3 cursor-pointer group"
                                    >
                                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider group-hover:text-emerald-400 mb-3">
                                            Konu
                                        </span>
                                        <div className="flex flex-col gap-1.5 items-center overflow-y-auto max-h-[580px] scrollbar-none">
                                            {availableTopics.map((topic, idx) => {
                                                const isSelected = selectedTopicId === topic.topicId;
                                                const hasText = topic.sourceText.length > 0;
                                                return (
                                                    <button
                                                        key={topic.topicId}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleTopicChange(topic.topicId);
                                                            setFocusedColumn('topic');
                                                        }}
                                                        title={topic.title}
                                                        className={cn(
                                                            "w-8 h-8 rounded-lg font-bold text-[11px] flex items-center justify-center transition-all relative",
                                                            isSelected
                                                                ? "bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400/50 scale-105"
                                                                : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                                                        )}
                                                    >
                                                        {idx + 1}
                                                        {hasText && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1 right-1" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── SAĞ BÖLÜM: DİJİTAL KİTAP SAYFASI (READER & INLINE EDITOR) ── */}
                        <div className="xl:col-span-7 2xl:col-span-7 flex flex-col h-[780px] xl:h-[820px] rounded-3xl bg-slate-900/80 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl relative">
                            {activeSelectedTopic ? (
                                <>
                                    {/* Kitap Üst Başlık & Yol Bilgisi */}
                                    <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/60 space-y-2">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-bold px-2.5 py-0.5">
                                                    {activeSelectedTopic.className}
                                                </Badge>
                                                <span className="text-slate-600">›</span>
                                                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs px-2.5 py-0.5">
                                                    {activeSelectedTopic.courseTitle}
                                                </Badge>
                                                <span className="text-slate-600">›</span>
                                                <span className="text-xs text-slate-400 font-medium truncate max-w-[320px] sm:max-w-[480px]" title={activeSelectedTopic.unitTitle}>
                                                    {activeSelectedTopic.unitTitle}
                                                </span>
                                            </div>

                                            {/* Durum Rozeti */}
                                            {activeSelectedTopic.sourceText.length > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Metin Kayıtlı ({activeSelectedTopic.wordCount} kelime)
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Metin Henüz Girilmedi
                                                </span>
                                            )}
                                        </div>

                                        {/* Konu Başlığı */}
                                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                                            {activeSelectedTopic.title}
                                        </h2>

                                        {/* Araç Çubuğu (Mod Değiştirici, Yazı Boyutu, Kopyala, Kaydet) */}
                                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3 flex-wrap">
                                            {/* Okuma / Düzenleme Butonları */}
                                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
                                                <button
                                                    onClick={() => setIsInlineEditing(false)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                                        !isInlineEditing
                                                            ? "bg-indigo-600 text-white shadow-md"
                                                            : "text-slate-400 hover:text-white"
                                                    )}
                                                >
                                                    <BookOpen className="w-3.5 h-3.5" /> Okuma Modu
                                                </button>
                                                <button
                                                    onClick={() => setIsInlineEditing(true)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                                                        isInlineEditing
                                                            ? "bg-indigo-600 text-white shadow-md"
                                                            : "text-slate-400 hover:text-white"
                                                    )}
                                                >
                                                    <FilePenLine className="w-3.5 h-3.5" /> Düzenleme Modu
                                                </button>
                                            </div>

                                            {/* Moda Göre Aksiyonlar */}
                                            {!isInlineEditing ? (
                                                <div className="flex items-center gap-2">
                                                    {/* Yazı Boyutu */}
                                                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10">
                                                        {(['sm', 'base', 'lg', 'xl'] as const).map(size => (
                                                            <button
                                                                key={size}
                                                                onClick={() => setReaderFontSize(size)}
                                                                className={cn(
                                                                    "px-2 py-1 rounded-lg text-xs font-bold transition-all",
                                                                    readerFontSize === size
                                                                        ? "bg-white/20 text-white"
                                                                        : "text-slate-500 hover:text-slate-300"
                                                                )}
                                                            >
                                                                {size === 'sm' ? 'A-' : size === 'base' ? 'A' : size === 'lg' ? 'A+' : 'A++'}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Kopyala */}
                                                    {activeSelectedTopic.sourceText && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleCopy(activeSelectedTopic.id, activeSelectedTopic.sourceText)}
                                                            className="h-8 border-white/10 text-slate-300 hover:text-white rounded-xl text-xs"
                                                            title="Metni Kopyala"
                                                        >
                                                            {copiedId === activeSelectedTopic.id ? (
                                                                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5 mr-1 text-slate-400" />
                                                            )}
                                                            Kopyala
                                                        </Button>
                                                    )}

                                                    {/* Sil / Temizle */}
                                                    {activeSelectedTopic.sourceText && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl"
                                                                    title="Metni Temizle"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-red-400">Kaynak Metni Temizle</AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-slate-400">
                                                                        <strong>{activeSelectedTopic.title}</strong> konusuna ait kaynak metin silinecektir. Bu işlem geri alınamaz.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="bg-transparent border-white/10 text-slate-300 hover:bg-white/5">İptal</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={() => handleClearText(activeSelectedTopic)}
                                                                        className="bg-red-600 hover:bg-red-500 text-white"
                                                                    >
                                                                        Evet, Temizle
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        type="button"
                                                        onClick={async () => {
                                                            try {
                                                                const text = await navigator.clipboard.readText();
                                                                if (text) {
                                                                    setInlineEditText(prev => prev ? prev + '\n' + text : text);
                                                                    toast({ title: "Yapıştırıldı", description: "Pano içeriği eklendi." });
                                                                }
                                                            } catch(e) {
                                                                toast({ title: "Hata", description: "Panodan okuma izni alınamadı.", variant: "destructive" });
                                                            }
                                                        }}
                                                        className="h-8 px-2.5 text-xs text-slate-300 hover:text-white rounded-xl"
                                                    >
                                                        <ClipboardPaste className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Panodan Yapıştır
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setIsInlineEditing(false)}
                                                        disabled={isSaving}
                                                        className="h-8 px-3 text-xs border-white/10 text-slate-300 hover:text-white rounded-xl"
                                                    >
                                                        Vazgeç
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        onClick={handleSaveInlineEdit}
                                                        disabled={isSaving}
                                                        className="h-8 px-4 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-900/40"
                                                    >
                                                        {isSaving ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Kaydediliyor...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Check className="w-3.5 h-3.5 mr-1.5" /> Değişiklikleri Kaydet
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ══ PDF SAYFA AKTARMA ASİSTANI (HIZLI ÇIKARICI) ══ */}
                                    <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between gap-3 text-xs flex-wrap">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="p-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            {pdfDoc ? (
                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                                                    <span className="font-bold text-white max-w-[160px] sm:max-w-[240px] truncate" title={pdfFileName}>
                                                        {pdfFileName}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/40 bg-emerald-500/10 font-mono">
                                                        {pdfTotalPages} Sayfa
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        onClick={() => pdfFileInputRef.current?.click()}
                                                        className="text-[11px] text-indigo-300 hover:text-white underline ml-1"
                                                    >
                                                        PDF Değiştir
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-200 font-bold">PDF Metin Asistanı:</span>
                                                    <span className="text-slate-400 hidden sm:inline">Ders kitabı PDF'inden sayfa aralığıyla tek tıkla metin aktarımı</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap ml-auto">
                                            {pdfDoc ? (
                                                <>
                                                    <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-white/10">
                                                        <span className="text-slate-400 text-[11px] font-semibold">Sayfa:</span>
                                                        <Input 
                                                            type="number" 
                                                            min={1} 
                                                            max={pdfTotalPages}
                                                            value={pdfStartPage} 
                                                            onChange={(e) => setPdfStartPage(e.target.value)}
                                                            placeholder="İlk"
                                                            className="w-14 h-7 text-xs bg-slate-900 text-white text-center p-0.5 rounded-lg border-white/10 font-mono"
                                                        />
                                                        <span className="text-slate-500">-</span>
                                                        <Input 
                                                            type="number" 
                                                            min={1} 
                                                            max={pdfTotalPages}
                                                            value={pdfEndPage} 
                                                            onChange={(e) => setPdfEndPage(e.target.value)}
                                                            placeholder="Son"
                                                            className="w-14 h-7 text-xs bg-slate-900 text-white text-center p-0.5 rounded-lg border-white/10 font-mono"
                                                        />
                                                    </div>

                                                    <Button
                                                        size="sm"
                                                        disabled={isExtractingPdf}
                                                        onClick={() => handleExtractPdfPages('replace')}
                                                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-8 px-3.5 rounded-xl shadow-lg transition-all text-xs flex items-center gap-1.5"
                                                    >
                                                        {isExtractingPdf ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                <span>{pdfExtractProgress || 'Aktarılıyor...'}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                                                                <span>Sayfaları Aktar</span>
                                                            </>
                                                        )}
                                                    </Button>

                                                    {isInlineEditing && inlineEditText.trim() && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isExtractingPdf}
                                                            onClick={() => handleExtractPdfPages('append')}
                                                            className="h-8 px-2.5 text-xs border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl"
                                                            title="Mevcut metnin sonuna ekle"
                                                        >
                                                            + Sona Ekle
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => pdfFileInputRef.current?.click()}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-8 px-3.5 rounded-xl shadow-md transition-all text-xs flex items-center gap-1.5"
                                                >
                                                    <FileUp className="w-3.5 h-3.5" />
                                                    <span>Ders Kitabı PDF'i Seç</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Kitap İçerik Gövdesi */}
                                    <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-950/60 border-y border-white/5 scrollbar-thin">
                                        {!isInlineEditing ? (
                                            activeSelectedTopic.sourceText ? (
                                                <div className="w-full space-y-4">
                                                    <div className={cn(
                                                        "leading-relaxed whitespace-pre-wrap font-sans text-slate-200 selection:bg-indigo-500/40 select-text",
                                                        readerFontSize === 'sm' && "text-sm",
                                                        readerFontSize === 'base' && "text-base sm:text-[17px] sm:leading-8",
                                                        readerFontSize === 'lg' && "text-lg sm:text-xl sm:leading-9",
                                                        readerFontSize === 'xl' && "text-xl sm:text-2xl sm:leading-10"
                                                    )}>
                                                        {activeSelectedTopic.sourceText}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                                                    <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-xl">
                                                        <BookOpen className="w-10 h-10" />
                                                    </div>
                                                    <h3 className="text-lg font-bold text-white">Bu Konuya Ait Kaynak Metin Henüz Eklenmemiş</h3>
                                                    <p className="text-sm text-slate-400 max-w-md">
                                                        Ders kitabı metnini buraya eklediğinizde; sunum oluşturucu, soru bankası sihirbazı ve etkinlik veri tabanında bu metin otomatik olarak kullanılır.
                                                    </p>
                                                    <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
                                                        {pdfDoc ? (
                                                            <Button
                                                                onClick={() => handleExtractPdfPages('replace')}
                                                                disabled={isExtractingPdf}
                                                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl px-5 h-10 shadow-lg shadow-emerald-950/50 flex items-center gap-2"
                                                            >
                                                                {isExtractingPdf ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                        <span>{pdfExtractProgress || 'Aktarılıyor...'}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                                                                        <span>PDF'ten Aktar (Sayfa {pdfStartPage}-{pdfEndPage})</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                onClick={() => pdfFileInputRef.current?.click()}
                                                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl px-5 h-10 shadow-lg shadow-indigo-950/50 flex items-center gap-2"
                                                            >
                                                                <FileUp className="w-4 h-4" />
                                                                <span>PDF Seçerek Otomatik Aktar</span>
                                                            </Button>
                                                        )}

                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setIsInlineEditing(true)}
                                                            className="border-white/10 hover:border-white/20 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold rounded-xl px-4 h-10"
                                                        >
                                                            <FilePenLine className="w-4 h-4 mr-2" /> Manuel Yaz veya Yapıştır
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="h-full flex flex-col space-y-2">
                                                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                                                    <span className="font-semibold text-indigo-300">
                                                        {inlineEditText.trim() ? inlineEditText.trim().split(/\s+/).filter(Boolean).length : 0} kelime • {inlineEditText.length.toLocaleString('tr-TR')} karakter
                                                    </span>
                                                    {inlineEditText && (
                                                        <button
                                                            onClick={() => setInlineEditText('')}
                                                            className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold"
                                                        >
                                                            <Eraser className="w-3.5 h-3.5" /> Alanı Temizle
                                                        </button>
                                                    )}
                                                </div>
                                                <Textarea
                                                    value={inlineEditText}
                                                    onChange={(e) => setInlineEditText(e.target.value)}
                                                    placeholder="Ders kitabı konusunu veya detaylı kaynak metni buraya yapıştırın ya da yazın..."
                                                    className="flex-1 min-h-[460px] bg-slate-900/90 border-white/10 text-white font-sans text-sm sm:text-base leading-relaxed p-5 rounded-2xl focus:border-indigo-500 resize-none shadow-inner"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Kitap Alt Sayfa Çevirme Barı (Previous / Next Topic) */}
                                    <div className="p-3.5 sm:p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={!prevTopic}
                                            onClick={handlePrevTopic}
                                            className="text-slate-300 hover:text-white disabled:opacity-30 rounded-xl text-xs font-semibold h-9 px-3"
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1 text-indigo-400" />
                                            <span className="truncate max-w-[200px] sm:max-w-[320px]">
                                                {prevTopic ? prevTopic.title : "Önceki Konu"}
                                            </span>
                                        </Button>

                                        <div className="text-center">
                                            <span className="text-xs font-mono text-slate-400">
                                                {currentTopicIndex >= 0 ? currentTopicIndex + 1 : 1} / {availableTopics.length}
                                            </span>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={!nextTopic}
                                            onClick={handleNextTopic}
                                            className="text-slate-300 hover:text-white disabled:opacity-30 rounded-xl text-xs font-semibold h-9 px-3"
                                        >
                                            <span className="truncate max-w-[200px] sm:max-w-[320px]">
                                                {nextTopic ? nextTopic.title : "Sonraki Konu"}
                                            </span>
                                            <ChevronRight className="w-4 h-4 ml-1 text-indigo-400" />
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <BookMarked className="w-12 h-12 text-slate-600 mb-3" />
                                    <p className="text-sm font-semibold text-white">İçeriği görüntülemek için soldaki fihristten bir konu seçin.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══ DÜZENLEME MODALI ══ */}
            <Dialog open={!!editingTopic} onOpenChange={(open) => !open && setEditingTopic(null)}>
                <DialogContent className="max-w-3xl bg-slate-900 border-white/10 text-white max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                                {editingTopic?.className}
                            </Badge>
                            <span className="text-xs text-slate-400">›</span>
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                {editingTopic?.courseTitle}
                            </Badge>
                            <span className="text-xs text-slate-400">›</span>
                            <span className="text-xs text-slate-400">{editingTopic?.unitTitle}</span>
                        </div>
                        <DialogTitle className="text-xl font-black text-white">
                            {editingTopic?.title} - Kaynak Metin
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Ders kitabı metnini veya konu özetini buraya girin. Bu metin sunumlarda, soru bankasında ve etkinlik üretiminde kullanılır.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Metin Düzenleme Alanı */}
                    <div className="space-y-3 py-2 flex-grow flex flex-col">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="font-semibold text-indigo-300">
                                {editText.trim() ? editText.trim().split(/\s+/).filter(Boolean).length : 0} kelime • {editText.length.toLocaleString('tr-TR')} karakter
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const text = await navigator.clipboard.readText();
                                            if (text) {
                                                setEditText(prev => prev ? prev + '\n' + text : text);
                                                toast({ title: "Yapıştırıldı", description: "Pano içeriği eklendi." });
                                            }
                                        } catch(e) {
                                            toast({ title: "Hata", description: "Panodan okuma izni alınamadı.", variant: "destructive" });
                                        }
                                    }}
                                    className="h-7 px-2 text-xs text-slate-300 hover:text-white"
                                >
                                    <ClipboardPaste className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Panodan Yapıştır
                                </Button>
                                {editText && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        type="button"
                                        onClick={() => setEditText('')}
                                        className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                                    >
                                        <Eraser className="w-3.5 h-3.5 mr-1" /> Temizle
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Ders kitabı konusunu veya detaylı kaynak metni buraya yapıştırın ya da yazın..."
                            className="min-h-[320px] sm:min-h-[380px] bg-slate-950 border-white/10 text-white font-sans text-sm leading-relaxed p-4 rounded-xl focus:border-indigo-500 resize-y flex-grow"
                        />
                    </div>

                    <DialogFooter className="border-t border-white/5 pt-3 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setEditingTopic(null)}
                            disabled={isSaving}
                            className="border-white/10 text-slate-300 hover:bg-white/5"
                        >
                            Vazgeç
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 shadow-lg shadow-indigo-900/30"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-1.5" /> Kaydet
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══ OKUMA / İNCELEME MODALI ══ */}
            <Dialog open={!!readingTopic} onOpenChange={(open) => !open && setReadingTopic(null)}>
                <DialogContent className="max-w-3xl bg-slate-900 border-white/10 text-white max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                                    {readingTopic?.className}
                                </Badge>
                                <span className="text-xs text-slate-400">›</span>
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                                    {readingTopic?.courseTitle}
                                </Badge>
                                <span className="text-xs text-slate-400">›</span>
                                <span className="text-xs text-slate-400">{readingTopic?.unitTitle}</span>
                            </div>

                            {/* Yazı Boyutu Ayarları */}
                            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-white/10">
                                <button
                                    onClick={() => setReaderFontSize('sm')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold", readerFontSize === 'sm' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    A-
                                </button>
                                <button
                                    onClick={() => setReaderFontSize('base')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold", readerFontSize === 'base' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    A
                                </button>
                                <button
                                    onClick={() => setReaderFontSize('lg')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold", readerFontSize === 'lg' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    A+
                                </button>
                                <button
                                    onClick={() => setReaderFontSize('xl')}
                                    className={cn("px-2 py-0.5 rounded text-xs font-bold", readerFontSize === 'xl' ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white")}
                                >
                                    A++
                                </button>
                            </div>
                        </div>

                        <DialogTitle className="text-xl font-black text-white pt-2">
                            {readingTopic?.title}
                        </DialogTitle>
                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                            <span>{readingTopic?.wordCount} kelime</span>
                            <span>•</span>
                            <span>{readingTopic?.charCount.toLocaleString('tr-TR')} karakter</span>
                            <span>•</span>
                            <span>Tahmini Okuma: ~{Math.ceil((readingTopic?.wordCount || 0) / 180)} dk</span>
                        </div>
                    </DialogHeader>

                    {/* Metin Okuma Alanı */}
                    <div className="flex-grow overflow-y-auto pr-2 py-4 my-2 border-y border-white/5 bg-slate-950/60 rounded-xl p-5 shadow-inner">
                        <div className={cn(
                            "leading-relaxed whitespace-pre-wrap font-sans text-slate-200 selection:bg-indigo-500/30",
                            readerFontSize === 'sm' && "text-sm",
                            readerFontSize === 'base' && "text-base",
                            readerFontSize === 'lg' && "text-lg",
                            readerFontSize === 'xl' && "text-xl"
                        )}>
                            {readingTopic?.sourceText}
                        </div>
                    </div>

                    <DialogFooter className="pt-2 flex items-center justify-between gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => readingTopic && handleCopy(readingTopic.id, readingTopic.sourceText)}
                            className="border-white/10 text-slate-300 hover:text-white"
                        >
                            <Copy className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> Metni Kopyala
                        </Button>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setReadingTopic(null)}
                                className="border-white/10 text-slate-300 hover:bg-white/5"
                            >
                                Kapat
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => {
                                    const t = readingTopic;
                                    setReadingTopic(null);
                                    if (t) handleOpenEdit(t);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                            >
                                <FilePenLine className="w-3.5 h-3.5 mr-1.5" /> Düzenle
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
