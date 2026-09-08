'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Columns, BookOpen, Search, Sparkles, Check, ChevronLeft, ChevronRight,
    Loader2, Save, Wand2, ArrowLeft, Download, Plus, Trash2, Maximize,
    Minimize, ExternalLink, RefreshCw, Layers, BookMarked, Eye, LayoutTemplate,
    ListOrdered, FileText, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    loadAllYazilacaklarData,
    saveTopicYazilacaklarAction,
    generateYazilacaklarAiAction,
    type YazilacaklarTopicItem,
    type ConceptItem
} from './actions';

const COLOR_CLASSES = [
    'bg-indigo-950/60 border-indigo-500/50 text-indigo-100 hover:border-indigo-400',
    'bg-emerald-950/60 border-emerald-500/50 text-emerald-100 hover:border-emerald-400',
    'bg-rose-950/60 border-rose-500/50 text-rose-100 hover:border-rose-400',
    'bg-amber-950/60 border-amber-500/50 text-amber-100 hover:border-amber-400',
    'bg-cyan-950/60 border-cyan-500/50 text-cyan-100 hover:border-cyan-400',
    'bg-fuchsia-950/60 border-fuchsia-500/50 text-fuchsia-100 hover:border-fuchsia-400',
];

function YazilacaklarStudioContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Data states
    const [items, setItems] = useState<YazilacaklarTopicItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Sidebar & View states
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
    const [focusedColumn, setFocusedColumn] = useState<'grade' | 'course' | 'unit' | 'topic'>('topic');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Selection states
    const [selectedGrade, setSelectedGrade] = useState<string>('5');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [selectedUnitId, setSelectedUnitId] = useState<string>('');
    const [selectedTopicId, setSelectedTopicId] = useState<string>('');

    // Studio Tabs: 'concepts' | 'notes' | 'smartboard' | 'source'
    const [activeTab, setActiveTab] = useState<'concepts' | 'notes' | 'smartboard' | 'source'>('concepts');

    // Content Editing State
    const [editingConcepts, setEditingConcepts] = useState<ConceptItem[]>([]);
    const [editingNotes, setEditingNotes] = useState<string[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
    const [aiDropdownOpen, setAiDropdownOpen] = useState<boolean>(false);

    // Smartboard Preview state
    const [previewSubTab, setPreviewSubTab] = useState<'kavramlar' | 'notlar'>('kavramlar');
    const [fontSize, setFontSize] = useState<number>(1.3);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

    // Load data from actions
    const loadData = async (showToast = false) => {
        setIsLoading(true);
        try {
            const res = await loadAllYazilacaklarData();
            if (res.success && res.items) {
                setItems(res.items);
                if (showToast) {
                    toast({ title: "Veriler Güncellendi", description: "Tüm müfredat kavramları ve notları yüklendi." });
                }
            } else {
                toast({ title: "Hata", description: res.error || "Veriler yüklenemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            console.error("loadData error:", err);
            toast({ title: "Hata", description: err.message || "Veri yüklenirken hata oluştu.", variant: "destructive" });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Parse URL query parameters on initial load (e.g. ?courseId=...&unitId=...&topicId=...)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const courseParam = params.get('courseId') || params.get('course');
        const unitParam = params.get('unitId') || params.get('unit');
        const topicParam = params.get('topicId') || params.get('topic');
        const tabParam = params.get('tab');

        if (tabParam === 'concepts' || tabParam === 'notes' || tabParam === 'smartboard' || tabParam === 'source') {
            setActiveTab(tabParam);
        }

        if (topicParam) {
            setSelectedTopicId(topicParam);
            if (courseParam) setSelectedCourseId(courseParam);
            if (unitParam) setSelectedUnitId(unitParam);
            setIsSidebarOpen(false); // Doğrudan linkle gelindiğinde sol panel kapalı açılsın
        }
    }, []);

    // Extract Unique Grades
    const availableGrades = useMemo(() => {
        const set = new Set<string>();
        items.forEach(i => set.add(i.grade));
        return Array.from(set).sort((a, b) => Number(a) - Number(b));
    }, [items]);

    // Ensure selectedGrade is valid
    useEffect(() => {
        if (availableGrades.length > 0 && !availableGrades.includes(selectedGrade)) {
            setSelectedGrade(availableGrades[0]);
        }
    }, [availableGrades, selectedGrade]);

    // Courses for selected Grade
    const availableCourses = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        items.filter(i => i.grade === selectedGrade).forEach(i => {
            if (!map.has(i.courseId)) {
                map.set(i.courseId, { id: i.courseId, title: i.courseTitle, count: 0 });
            }
            map.get(i.courseId)!.count++;
        });
        return Array.from(map.values());
    }, [items, selectedGrade]);

    // Ensure selectedCourseId is valid
    useEffect(() => {
        if (availableCourses.length > 0) {
            if (!selectedCourseId || !availableCourses.some(c => c.id === selectedCourseId)) {
                setSelectedCourseId(availableCourses[0].id);
            }
        } else {
            setSelectedCourseId('');
        }
    }, [availableCourses, selectedCourseId]);

    // Units for selected Grade & Course
    const availableUnits = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number; withContentCount: number }>();
        items.filter(i => i.grade === selectedGrade && i.courseId === selectedCourseId).forEach(i => {
            if (!map.has(i.unitId)) {
                map.set(i.unitId, { id: i.unitId, title: i.unitTitle, count: 0, withContentCount: 0 });
            }
            const unitObj = map.get(i.unitId)!;
            unitObj.count++;
            if (i.hasContent) {
                unitObj.withContentCount++;
            }
        });
        return Array.from(map.values());
    }, [items, selectedGrade, selectedCourseId]);

    // Ensure selectedUnitId is valid
    useEffect(() => {
        if (availableUnits.length > 0) {
            if (!selectedUnitId || !availableUnits.some(u => u.id === selectedUnitId)) {
                setSelectedUnitId(availableUnits[0].id);
            }
        } else {
            setSelectedUnitId('');
        }
    }, [availableUnits, selectedUnitId]);

    // Topics for selected Unit
    const currentUnitTopics = useMemo(() => {
        return items.filter(i =>
            i.grade === selectedGrade &&
            i.courseId === selectedCourseId &&
            i.unitId === selectedUnitId
        );
    }, [items, selectedGrade, selectedCourseId, selectedUnitId]);

    // Ensure selectedTopicId is valid
    useEffect(() => {
        if (currentUnitTopics.length > 0) {
            if (!selectedTopicId || !currentUnitTopics.some(t => t.topicId === selectedTopicId)) {
                setSelectedTopicId(currentUnitTopics[0].topicId);
            }
        }
    }, [currentUnitTopics, selectedTopicId]);

    // Active Selected Topic Item
    const activeTopic = useMemo(() => {
        return items.find(i => i.topicId === selectedTopicId) || currentUnitTopics[0] || null;
    }, [items, selectedTopicId, currentUnitTopics]);

    // Sync editing state when activeTopic changes
    useEffect(() => {
        if (activeTopic) {
            setEditingConcepts(activeTopic.conceptDefinitions || []);
            setEditingNotes(activeTopic.notes || []);
            setHasUnsavedChanges(false);
        }
    }, [activeTopic]);

    // Topic Selection Handler with Auto-Collapse
    const handleTopicSelect = (topicId: string, autoCollapse = true) => {
        setSelectedTopicId(topicId);
        setFocusedColumn('topic');
        if (autoCollapse) {
            setIsSidebarOpen(false);
        }
    };

    // Sequential Navigation within Unit
    const currentIndex = useMemo(() => {
        return currentUnitTopics.findIndex(i => i.topicId === selectedTopicId);
    }, [currentUnitTopics, selectedTopicId]);

    const prevTopic = currentIndex > 0 ? currentUnitTopics[currentIndex - 1] : null;
    const nextTopic = currentIndex >= 0 && currentIndex < currentUnitTopics.length - 1 ? currentUnitTopics[currentIndex + 1] : null;

    // Global Search Matches (across all grades, topics, concepts, notes)
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return items.filter(i =>
            i.title.toLowerCase().includes(q) ||
            i.unitTitle.toLowerCase().includes(q) ||
            i.courseTitle.toLowerCase().includes(q) ||
            i.className.toLowerCase().includes(q) ||
            i.notes.some(n => n.toLowerCase().includes(q)) ||
            i.conceptDefinitions.some(c => c.concept.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q))
        ).slice(0, 10);
    }, [items, searchQuery]);

    const handleSelectSearchResult = (topic: YazilacaklarTopicItem) => {
        setSelectedGrade(topic.grade);
        setSelectedCourseId(topic.courseId);
        setSelectedUnitId(topic.unitId);
        setSelectedTopicId(topic.topicId);
        setFocusedColumn('topic');
        setSearchQuery('');
        setIsSidebarOpen(false);
    };

    // Concept Modifications
    const handleConceptChange = (index: number, field: 'concept' | 'definition', val: string) => {
        setEditingConcepts(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: val };
            return copy;
        });
        setHasUnsavedChanges(true);
    };

    const handleAddConcept = () => {
        setEditingConcepts(prev => [...prev, { concept: '', definition: '' }]);
        setHasUnsavedChanges(true);
    };

    const handleRemoveConcept = (index: number) => {
        setEditingConcepts(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // Note Modifications
    const handleNoteChange = (index: number, val: string) => {
        setEditingNotes(prev => {
            const copy = [...prev];
            copy[index] = val;
            return copy;
        });
        setHasUnsavedChanges(true);
    };

    const handleAddNote = () => {
        setEditingNotes(prev => [...prev, '']);
        setHasUnsavedChanges(true);
    };

    const handleRemoveNote = (index: number) => {
        setEditingNotes(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // Save Action
    const handleSave = async () => {
        if (!activeTopic) return;
        setIsSaving(true);
        try {
            const res = await saveTopicYazilacaklarAction({
                courseId: activeTopic.courseId,
                unitId: activeTopic.unitId,
                topicId: activeTopic.topicId,
                notes: editingNotes,
                conceptDefinitions: editingConcepts
            });

            if (res.success) {
                // Update local items state
                setItems(prev => prev.map(item => {
                    if (item.topicId === activeTopic.topicId) {
                        return {
                            ...item,
                            notes: editingNotes.filter(n => n.trim().length > 0),
                            conceptDefinitions: editingConcepts.filter(c => c.concept.trim() || c.definition.trim()),
                            conceptsCount: editingConcepts.length,
                            notesCount: editingNotes.length,
                            hasContent: editingConcepts.length > 0 || editingNotes.length > 0
                        };
                    }
                    return item;
                }));
                setHasUnsavedChanges(false);
                toast({
                    title: "Başarıyla Kaydedildi! 💾",
                    description: `"${activeTopic.title}" konusuna ait kavramlar ve notlar güncellendi.`
                });
            } else {
                toast({ title: "Kayıt Başarısız", description: res.error || "Bilinmeyen hata.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message || "Kaydedilirken hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // AI Generation
    const handleGenerateAi = async (mode: 'all' | 'concepts' | 'notes' = 'all') => {
        if (!activeTopic) return;
        setIsGeneratingAi(true);
        setAiDropdownOpen(false);
        try {
            const res = await generateYazilacaklarAiAction({
                sourceText: activeTopic.sourceText,
                topicTitle: activeTopic.title,
                grade: activeTopic.grade,
                courseTitle: activeTopic.courseTitle,
                mode: mode
            });

            if (res.success) {
                if (mode === 'all' || mode === 'concepts') {
                    if (res.conceptDefinitions && res.conceptDefinitions.length > 0) {
                        setEditingConcepts(res.conceptDefinitions);
                    }
                }
                if (mode === 'all' || mode === 'notes') {
                    if (res.notes && res.notes.length > 0) {
                        setEditingNotes(res.notes);
                    }
                }
                setHasUnsavedChanges(true);
                toast({
                    title: "Yapay Zeka İçeriği Hazırladı! ✨",
                    description: "Kavramlar ve notlar ders kitabından çıkarıldı. Beğendiyseniz Kaydet butonuna basarak kalıcı hale getirebilirsiniz."
                });
            } else {
                toast({ title: "Yapay Zeka Hatası", description: res.error || "İçerik üretilemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message || "Yapay zeka çalıştırılırken hata oluştu.", variant: "destructive" });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // PDF Download / Print
    const handleDownloadPdf = () => {
        if (!activeTopic) return;
        setIsDownloadingPdf(true);

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${activeTopic.title} - Kavramlar & Notlar</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
                        .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 13px; margin-bottom: 8px; }
                        h1 { font-size: 26px; font-weight: 800; margin: 0; color: #0f172a; }
                        .hierarchy { font-size: 14px; color: #64748b; margin-top: 6px; }
                        h2 { font-size: 20px; font-weight: 700; color: #4338ca; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-top: 28px; }
                        .concepts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 14px; }
                        .concept-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; background: #f8fafc; page-break-inside: avoid; }
                        .concept-name { font-weight: 800; font-size: 16px; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; }
                        .concept-def { font-size: 14px; color: #334155; }
                        .notes-list { list-style: none; padding: 0; margin-top: 14px; }
                        .note-item { display: flex; gap: 12px; margin-bottom: 12px; page-break-inside: avoid; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; }
                        .note-number { width: 26px; height: 26px; border-radius: 8px; background: #d97706; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; }
                        .note-text { font-size: 14px; font-weight: 600; color: #1e293b; }
                        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                        @media print {
                            body { padding: 20px; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <span class="badge">${activeTopic.className}</span>
                        <h1>${activeTopic.title}</h1>
                        <div class="hierarchy">${activeTopic.courseTitle} › ${activeTopic.unitTitle}</div>
                    </div>
            `;

            if (editingConcepts.length > 0) {
                htmlContent += `<h2>🏷️ Anahtar Kavramlar ve Tanımları</h2><div class="concepts-grid">`;
                editingConcepts.forEach(c => {
                    if (c.concept || c.definition) {
                        htmlContent += `
                            <div class="concept-card">
                                <div class="concept-name">${c.concept}</div>
                                <div class="concept-def">${c.definition}</div>
                            </div>
                        `;
                    }
                });
                htmlContent += `</div>`;
            }

            if (editingNotes.length > 0) {
                htmlContent += `<h2>📝 Deftere Yazılacak Önemli Notlar</h2><div class="notes-list">`;
                editingNotes.forEach((n, idx) => {
                    if (n.trim()) {
                        htmlContent += `
                            <div class="note-item">
                                <div class="note-number">${idx + 1}</div>
                                <div class="note-text">${n}</div>
                            </div>
                        `;
                    }
                });
                htmlContent += `</div>`;
            }

            htmlContent += `
                    <div class="footer">
                        Değerler Oyunu & Akıllı Tahta Kavram Panosu • ${new Date().toLocaleDateString('tr-TR')}
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 600);
        }
        setIsDownloadingPdf(false);
    };

    // Presentation URL for the smartboard player
    const smartboardPlayUrl = activeTopic
        ? `/teacher/smartboard/yazilacaklar/oyun?courseId=${activeTopic.courseId}&unitId=${activeTopic.unitId}&topicId=${activeTopic.topicId}`
        : '#';

    // Unit source/concepts statistics
    const unitMetrics = useMemo(() => {
        const total = currentUnitTopics.length;
        const withContent = currentUnitTopics.filter(t => t.hasContent).length;
        return { total, withContent, pct: total > 0 ? Math.round((withContent / total) * 100) : 0 };
    }, [currentUnitTopics]);

    if (isLoading && items.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                    <p className="text-slate-400 font-bold text-lg">Kavram & Notlar Stüdyosu Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden font-sans">
            
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col max-w-[1720px] w-full mx-auto p-3 sm:p-5 md:p-6 space-y-4">
                
                {/* ══ ÜST HEADER: BAŞLIK, ARAMA, EYLEMLER ══ */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-900/80 border border-white/10 rounded-3xl p-4 md:p-5 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-900/40 border border-purple-400/30 flex-shrink-0">
                            <Columns className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    Kavram Panosu & Yazılacaklar Stüdyosu
                                </h1>
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] font-mono">
                                    TEK MERKEZ
                                </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-400 font-medium">
                                Konu kavramlarını, terim tanımlarını ve deftere yazılacak özet notları tek ekrandan yönetin.
                            </p>
                        </div>
                    </div>

                    {/* Arama Çubuğu & Butonlar */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Global Arama */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                                placeholder="Kavram, not veya konu ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-slate-950/70 border-white/10 text-xs rounded-xl focus:border-purple-500 text-white placeholder:text-slate-500"
                            />
                            {/* Arama Sonuçları Açılır Menüsü */}
                            {searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 top-12 bg-slate-900 border border-white/20 rounded-2xl p-2 shadow-2xl z-50 max-h-80 overflow-y-auto space-y-1">
                                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Bulunan Konular ({searchResults.length})
                                    </div>
                                    {searchResults.map(res => (
                                        <button
                                            key={res.id}
                                            onClick={() => handleSelectSearchResult(res)}
                                            className="w-full text-left p-2 rounded-xl hover:bg-purple-600/30 text-xs transition-colors flex items-center justify-between group"
                                        >
                                            <div className="truncate pr-2">
                                                <div className="font-bold text-white group-hover:text-purple-300 truncate">{res.title}</div>
                                                <div className="text-[10px] text-slate-400 truncate">{res.className} • {res.unitTitle}</div>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {res.conceptsCount > 0 && (
                                                    <span className="text-[9px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                                                        {res.conceptsCount} K.
                                                    </span>
                                                )}
                                                {res.notesCount > 0 && (
                                                    <span className="text-[9px] bg-amber-950 border border-amber-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                                                        {res.notesCount} N.
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Yenile Butonu */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setIsRefreshing(true); loadData(true); }}
                            disabled={isRefreshing}
                            className="border-white/10 hover:bg-white/10 text-slate-300 rounded-xl h-10 px-3"
                            title="Verileri Yenile"
                        >
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-purple-400")} />
                        </Button>

                        {/* Akıllı Tahta Başlat Butonu */}
                        <Button
                            variant="outline"
                            asChild
                            disabled={!activeTopic}
                            className="rounded-xl h-10 px-3.5 text-xs font-bold border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 hover:text-white transition-all shadow-md"
                        >
                            <Link href={smartboardPlayUrl} target="_blank">
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                <span>Akıllı Tahtada Aç</span>
                            </Link>
                        </Button>

                        {/* PDF İndir / Yazdır Butonu */}
                        <Button
                            variant="outline"
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf || !activeTopic}
                            className="rounded-xl h-10 px-3.5 text-xs font-bold border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                        >
                            {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                            <span>PDF Yazdır</span>
                        </Button>

                        {/* AI İle Doldur (Dropdown Menü) */}
                        <div className="relative">
                            <Button
                                onClick={() => setAiDropdownOpen(prev => !prev)}
                                disabled={isGeneratingAi || !activeTopic}
                                className="rounded-xl h-10 px-3.5 text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-950/50 flex items-center gap-1.5"
                            >
                                {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-pink-200" />}
                                <span>AI İle Doldur</span>
                            </Button>

                            {aiDropdownOpen && (
                                <div className="absolute right-0 top-12 bg-slate-900 border border-white/20 rounded-2xl p-2 shadow-2xl z-50 w-56 space-y-1">
                                    <button
                                        onClick={() => handleGenerateAi('all')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-purple-600/40 flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4 text-yellow-400" />
                                        <span>Tümünü Üret (Kavram + Not)</span>
                                    </button>
                                    <button
                                        onClick={() => handleGenerateAi('concepts')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-cyan-300 hover:bg-cyan-600/30 flex items-center gap-2"
                                    >
                                        <Columns className="w-4 h-4 text-cyan-400" />
                                        <span>Yalnızca Kavramları Çıkar</span>
                                    </button>
                                    <button
                                        onClick={() => handleGenerateAi('notes')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-600/30 flex items-center gap-2"
                                    >
                                        <ListOrdered className="w-4 h-4 text-amber-400" />
                                        <span>Yalnızca Notları Üret</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Kaydet Butonu */}
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !activeTopic}
                            className={cn(
                                "rounded-xl h-10 px-4 text-xs font-black transition-all shadow-lg flex items-center gap-1.5",
                                hasUnsavedChanges
                                    ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-950/60 ring-2 ring-emerald-400/40 animate-pulse"
                                    : "bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100"
                            )}
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>{hasUnsavedChanges ? "Kaydet (Değişiklik Var)" : "Kaydet"}</span>
                        </Button>
                    </div>
                </div>

                {/* ══ MILLER COLUMNS FİHRİST & ÇALIŞMA MASASI DÜZENİ ══ */}
                <div className={cn(
                    "grid gap-4 2xl:gap-6 items-start w-full transition-all duration-300",
                    isSidebarOpen ? "grid-cols-1 xl:grid-cols-12" : "grid-cols-1"
                )}>

                    {/* ── SOL PANEL: 4 KADEMELİ MÜFREDAT FİHRİSTİ (MILLER COLUMNS - GİZLENEBİLİR) ── */}
                    {isSidebarOpen && (
                        <div className="xl:col-span-5 2xl:col-span-5 flex flex-col h-[820px] xl:h-[880px] rounded-3xl bg-slate-900/75 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
                            {/* Fihrist Üst Bar */}
                            <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <LayoutTemplate className="w-5 h-5 text-purple-400" />
                                    <span className="font-bold text-sm text-white">Müfredat Fihristi</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                        <button
                                            onClick={() => setFocusedColumn('grade')}
                                            className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'grade' ? "bg-purple-600 text-white font-bold" : "hover:text-white")}
                                        >
                                            Sınıf
                                        </button>
                                        <span>›</span>
                                        <button
                                            onClick={() => setFocusedColumn('course')}
                                            className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'course' ? "bg-purple-600 text-white font-bold" : "hover:text-white")}
                                        >
                                            Ders
                                        </button>
                                        <span>›</span>
                                        <button
                                            onClick={() => setFocusedColumn('unit')}
                                            className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'unit' ? "bg-purple-600 text-white font-bold" : "hover:text-white")}
                                        >
                                            Ünite
                                        </button>
                                        <span>›</span>
                                        <button
                                            onClick={() => setFocusedColumn('topic')}
                                            className={cn("px-2 py-0.5 rounded-lg transition-colors", focusedColumn === 'topic' ? "bg-purple-600 text-white font-bold" : "hover:text-white")}
                                        >
                                            Konu
                                        </button>
                                    </div>
                                    {/* Fihristi Gizle Butonu */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-8 px-2 text-xs flex items-center gap-1 border border-white/10 ml-1"
                                        title="Fihristi Gizle (Geniş Çalışma Masası)"
                                    >
                                        <PanelLeftClose className="w-4 h-4 text-purple-400" />
                                        <span className="hidden sm:inline">Gizle</span>
                                    </Button>
                                </div>
                            </div>

                            {/* 4 Kademeli Kolon Konteyneri */}
                            <div className="flex-1 grid grid-cols-4 divide-x divide-white/10 overflow-hidden text-xs">
                                
                                {/* KOLON 1: Sınıflar */}
                                <div className={cn("flex flex-col h-full bg-slate-950/30 overflow-hidden", focusedColumn === 'grade' && "ring-1 ring-inset ring-purple-500/30")}>
                                    <div className="p-3 border-b border-white/10 bg-slate-950/40 flex items-center justify-between font-bold text-slate-300">
                                        <span>Sınıf</span>
                                        <span className="text-[10px] text-slate-500">{availableGrades.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                                        {availableGrades.map(grade => {
                                            const isSelected = selectedGrade === grade;
                                            return (
                                                <button
                                                    key={grade}
                                                    onClick={() => {
                                                        setSelectedGrade(grade);
                                                        setFocusedColumn('course');
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between font-bold",
                                                        isSelected
                                                            ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50"
                                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <span>{grade}. Sınıf</span>
                                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md", isSelected ? "bg-purple-800 text-purple-200" : "bg-slate-800 text-slate-500")}>
                                                        {items.filter(i => i.grade === grade).length}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* KOLON 2: Dersler */}
                                <div className={cn("flex flex-col h-full bg-slate-950/20 overflow-hidden", focusedColumn === 'course' && "ring-1 ring-inset ring-purple-500/30")}>
                                    <div className="p-3 border-b border-white/10 bg-slate-950/40 flex items-center justify-between font-bold text-slate-300">
                                        <span>Ders</span>
                                        <span className="text-[10px] text-slate-500">{availableCourses.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                                        {availableCourses.map(course => {
                                            const isSelected = selectedCourseId === course.id;
                                            return (
                                                <button
                                                    key={course.id}
                                                    onClick={() => {
                                                        setSelectedCourseId(course.id);
                                                        setFocusedColumn('unit');
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1 font-bold",
                                                        isSelected
                                                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50"
                                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <span className="truncate leading-snug">{course.title}</span>
                                                    <span className={cn("text-[10px] font-normal", isSelected ? "text-indigo-200" : "text-slate-500")}>
                                                        {course.count} Konu
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* KOLON 3: Üniteler */}
                                <div className={cn("flex flex-col h-full bg-slate-950/30 overflow-hidden", focusedColumn === 'unit' && "ring-1 ring-inset ring-purple-500/30")}>
                                    <div className="p-3 border-b border-white/10 bg-slate-950/40 flex items-center justify-between font-bold text-slate-300">
                                        <span>Ünite</span>
                                        <span className="text-[10px] text-slate-500">{availableUnits.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                                        {availableUnits.map(unit => {
                                            const isSelected = selectedUnitId === unit.id;
                                            return (
                                                <button
                                                    key={unit.id}
                                                    onClick={() => {
                                                        setSelectedUnitId(unit.id);
                                                        setFocusedColumn('topic');
                                                    }}
                                                    className={cn(
                                                        "w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1",
                                                        isSelected
                                                            ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/50 font-bold"
                                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <span className="line-clamp-2 leading-snug">{unit.title}</span>
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className={isSelected ? "text-cyan-200" : "text-slate-500"}>
                                                            {unit.count} Konu
                                                        </span>
                                                        {unit.withContentCount > 0 && (
                                                            <span className={cn("px-1 rounded", isSelected ? "bg-cyan-800 text-white" : "bg-emerald-950/70 text-emerald-400")}>
                                                                {unit.withContentCount}/{unit.count} Hazır
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* KOLON 4: Konular (Seçilince Sol Panel Otomatik Kapanır) */}
                                <div className={cn("flex flex-col h-full bg-slate-950/40 overflow-hidden", focusedColumn === 'topic' && "ring-1 ring-inset ring-purple-500/30")}>
                                    <div className="p-3 border-b border-white/10 bg-slate-950/50 flex items-center justify-between font-bold text-slate-300">
                                        <span>Konular</span>
                                        <span className="text-[10px] text-slate-500">{currentUnitTopics.length}</span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
                                        {currentUnitTopics.map(topic => {
                                            const isSelected = selectedTopicId === topic.topicId;
                                            return (
                                                <button
                                                    key={topic.topicId}
                                                    onClick={() => handleTopicSelect(topic.topicId, true)}
                                                    className={cn(
                                                        "w-full text-left p-2.5 rounded-xl transition-all flex flex-col gap-1.5 group border",
                                                        isSelected
                                                            ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/60 font-bold"
                                                            : "bg-slate-900/60 border-white/5 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20"
                                                    )}
                                                >
                                                    <span className="line-clamp-2 leading-snug">{topic.title}</span>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {topic.conceptsCount > 0 ? (
                                                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono font-bold", isSelected ? "bg-purple-800 text-purple-200" : "bg-cyan-950 border border-cyan-800 text-cyan-300")}>
                                                                {topic.conceptsCount} Kavram
                                                            </span>
                                                        ) : null}
                                                        {topic.notesCount > 0 ? (
                                                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono font-bold", isSelected ? "bg-purple-800 text-purple-200" : "bg-amber-950 border border-amber-800 text-amber-300")}>
                                                                {topic.notesCount} Not
                                                            </span>
                                                        ) : null}
                                                        {!topic.hasContent && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                                                                Boş
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* ── SAĞ PANEL: DİJİTAL ÇALIŞMA MASASI & STÜDYO (TAM GENİŞLİK VE SEKMELER) ── */}
                    <div className={cn(
                        "flex flex-col h-[820px] xl:h-[880px] rounded-3xl bg-slate-900/75 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-300",
                        isSidebarOpen ? "xl:col-span-7 2xl:col-span-7" : "col-span-12 w-full"
                    )}>

                        {/* Stüdyo Başlık Barı ve Hiyerarşi */}
                        <div className="p-4 border-b border-white/10 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* Fihrist Aç / Kapat Butonu */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsSidebarOpen(prev => !prev)}
                                    className={cn(
                                        "rounded-xl h-10 px-3.5 text-xs font-bold transition-all shadow-lg flex items-center gap-2 flex-shrink-0",
                                        !isSidebarOpen
                                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/60 shadow-purple-950/60 ring-2 ring-purple-400/30"
                                            : "border-white/10 text-slate-300 hover:text-white bg-slate-900"
                                    )}
                                    title={isSidebarOpen ? "Fihristi Gizle" : "Müfredat Fihristini Aç (Sınıf, Ünite veya Konu Değiştir)"}
                                >
                                    {isSidebarOpen ? (
                                        <>
                                            <PanelLeftClose className="w-4 h-4 text-purple-300" />
                                            <span className="hidden sm:inline">Fihristi Gizle</span>
                                        </>
                                    ) : (
                                        <>
                                            <PanelLeftOpen className="w-4 h-4 text-white animate-pulse" />
                                            <span>Fihristi Aç (Konu Değiştir)</span>
                                        </>
                                    )}
                                </Button>

                                {/* Tıklanabilir Ekmek Kırıntısı (Breadcrumbs) */}
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400 font-medium">
                                        <button
                                            type="button"
                                            onClick={() => { setIsSidebarOpen(true); setFocusedColumn('grade'); }}
                                            className="text-purple-400 font-bold hover:underline hover:text-purple-300 transition-colors cursor-pointer"
                                            title="Sınıf değiştirmek için fihristi aç"
                                        >
                                            {selectedGrade}. Sınıf
                                        </button>
                                        <span>›</span>
                                        <button
                                            type="button"
                                            onClick={() => { setIsSidebarOpen(true); setFocusedColumn('course'); }}
                                            className="truncate max-w-[140px] hover:underline hover:text-white transition-colors cursor-pointer"
                                            title="Ders değiştirmek için fihristi aç"
                                        >
                                            {activeTopic?.courseTitle || availableCourses.find(c => c.id === selectedCourseId)?.title || 'Ders'}
                                        </button>
                                        <span>›</span>
                                        <button
                                            type="button"
                                            onClick={() => { setIsSidebarOpen(true); setFocusedColumn('unit'); }}
                                            className="truncate max-w-[140px] hover:underline hover:text-white transition-colors cursor-pointer"
                                            title="Ünite değiştirmek için fihristi aç"
                                        >
                                            {activeTopic?.unitTitle || availableUnits.find(u => u.id === selectedUnitId)?.title || 'Ünite'}
                                        </button>
                                        {activeTopic && (
                                            <Badge
                                                onClick={() => { setIsSidebarOpen(true); setFocusedColumn('topic'); }}
                                                className="text-[10px] font-black uppercase px-2 py-0.5 ml-1 cursor-pointer hover:opacity-80 transition-opacity bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                                                title="Konu listesini görmek için fihristi aç"
                                            >
                                                KONU
                                            </Badge>
                                        )}
                                    </div>
                                    <h2 className="text-base sm:text-lg font-black text-white truncate flex items-center gap-2">
                                        {activeTopic?.title || 'Konu Seçilmedi'}
                                    </h2>
                                </div>
                            </div>

                            {/* Önceki & Sonraki Konu Gezinmesi */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!prevTopic}
                                    onClick={() => prevTopic && handleTopicSelect(prevTopic.topicId, false)}
                                    className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-9 px-3 text-xs"
                                    title={prevTopic ? `Önceki: ${prevTopic.title}` : 'Önceki konu yok'}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={!nextTopic}
                                    onClick={() => nextTopic && handleTopicSelect(nextTopic.topicId, false)}
                                    className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-9 px-3 text-xs"
                                    title={nextTopic ? `Sonraki: ${nextTopic.title}` : 'Sonraki konu yok'}
                                >
                                    Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>

                        {/* ══ STÜDYO 4 TEMEL ÇALIŞMA SEKMESİ ══ */}
                        <div className="px-4 py-2.5 bg-slate-950/50 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-white/10 flex-wrap">
                                <button
                                    onClick={() => setActiveTab('concepts')}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'concepts'
                                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/40"
                                            : "text-cyan-400 hover:text-white"
                                    )}
                                >
                                    <Columns className="w-3.5 h-3.5" />
                                    <span>1. Kavramlar & Terimler</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded font-bold">
                                        {editingConcepts.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('notes')}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'notes'
                                            ? "bg-amber-600 text-white shadow-md shadow-amber-950/40"
                                            : "text-amber-400 hover:text-white"
                                    )}
                                >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                    <span>2. Önemli Notlar</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded font-bold">
                                        {editingNotes.length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('smartboard')}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'smartboard'
                                            ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                                            : "text-purple-300 hover:text-white"
                                    )}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>3. Akıllı Tahta Önizleme</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('source')}
                                    className={cn(
                                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'source'
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                                            : "text-emerald-400 hover:text-white"
                                    )}
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>4. Ders Kitabı Metni</span>
                                    {activeTopic?.sourceText && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded">
                                            {activeTopic.sourceText.trim().split(/\s+/).length} kelime
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Unsaved indicator */}
                            {hasUnsavedChanges && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 px-3 py-1 rounded-xl">
                                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                    <span>Kaydedilmemiş değişiklikler var</span>
                                </div>
                            )}
                        </div>

                        {/* ══ SEKME İÇERİKLERİ ══ */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">

                            {/* ── 1. KAVRAMLAR VE TERİMLER SEKMESİ ── */}
                            {activeTab === 'concepts' && (
                                <div className="space-y-4 max-w-5xl mx-auto">
                                    {/* Araç Çubuğu */}
                                    <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-2xl border border-white/10">
                                        <div>
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <span>Anahtar Kavramlar ve Tanımları</span>
                                                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-[10px]">
                                                    {editingConcepts.length} Adet
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Öğrencilerin öğrenmesi gereken kavramları ve açıklamalarını düzenleyin.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleGenerateAi('concepts')}
                                                disabled={isGeneratingAi || !activeTopic}
                                                variant="outline"
                                                size="sm"
                                                className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/50 hover:text-white rounded-xl text-xs"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Kavram Çıkar
                                            </Button>
                                            <Button
                                                onClick={handleAddConcept}
                                                size="sm"
                                                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Yeni Kavram Ekle
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Kavram Kartları Grid */}
                                    {editingConcepts.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            {editingConcepts.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-slate-900/90 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-4 transition-all space-y-2.5 relative group"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <span className="w-6 h-6 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center text-xs font-mono font-bold">
                                                                {idx + 1}
                                                            </span>
                                                            <Input
                                                                placeholder="Kavram / Terim Adı (Örn: Tevhid, İhlas)"
                                                                value={item.concept}
                                                                onChange={(e) => handleConceptChange(idx, 'concept', e.target.value)}
                                                                className="h-8 bg-slate-950/70 border-white/10 font-bold text-white text-xs focus:border-cyan-400 rounded-lg"
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveConcept(idx)}
                                                            className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                                                            title="Kavramı Sil"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                    <Textarea
                                                        placeholder="Kavramın açıklaması ve tanımı..."
                                                        value={item.definition}
                                                        onChange={(e) => handleConceptChange(idx, 'definition', e.target.value)}
                                                        rows={2}
                                                        className="bg-slate-950/50 border-white/10 text-xs text-slate-300 focus:border-cyan-400 rounded-xl leading-relaxed"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
                                            <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center">
                                                <Columns className="w-7 h-7 text-cyan-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-white">Henüz Kavram Eklenmedi</h4>
                                                <p className="text-xs text-slate-400 max-w-md">
                                                    Bu konu için yapay zeka ile kaynak metinden kavramları otomatik çıkarabilir veya kendiniz manuel olarak ekleyebilirsiniz.
                                                </p>
                                            </div>
                                            <div className="flex gap-2.5">
                                                <Button
                                                    onClick={() => handleGenerateAi('concepts')}
                                                    disabled={isGeneratingAi}
                                                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl"
                                                >
                                                    <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Kavramları Çıkar
                                                </Button>
                                                <Button
                                                    onClick={handleAddConcept}
                                                    variant="outline"
                                                    className="border-white/10 text-slate-300 text-xs rounded-xl"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Manuel Ekle
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 2. ÖNEMLİ NOTLAR SEKMESİ ── */}
                            {activeTab === 'notes' && (
                                <div className="space-y-4 max-w-5xl mx-auto">
                                    {/* Araç Çubuğu */}
                                    <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-2xl border border-white/10">
                                        <div>
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <span>Deftere Yazılacak Önemli Notlar</span>
                                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px]">
                                                    {editingNotes.length} Madde
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Öğrencilerin akıllı tahtadan defterlerine yazacağı özet cümleler.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleGenerateAi('notes')}
                                                disabled={isGeneratingAi || !activeTopic}
                                                variant="outline"
                                                size="sm"
                                                className="border-amber-500/30 text-amber-300 hover:bg-amber-950/50 hover:text-white rounded-xl text-xs"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Notları Doldur
                                            </Button>
                                            <Button
                                                onClick={handleAddNote}
                                                size="sm"
                                                className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Yeni Madde Ekle
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Not Maddeleri Listesi */}
                                    {editingNotes.length > 0 ? (
                                        <div className="space-y-3">
                                            {editingNotes.map((note, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-slate-900/90 border border-white/10 hover:border-amber-500/40 rounded-2xl p-3.5 transition-all flex items-start gap-3 group"
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md mt-1">
                                                        {idx + 1}
                                                    </div>
                                                    <Textarea
                                                        placeholder={`Özet not maddesi ${idx + 1}...`}
                                                        value={note}
                                                        onChange={(e) => handleNoteChange(idx, e.target.value)}
                                                        rows={2}
                                                        className="bg-slate-950/60 border-white/10 text-xs font-medium text-slate-200 focus:border-amber-400 rounded-xl leading-relaxed flex-1"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveNote(idx)}
                                                        className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl flex-shrink-0 mt-1"
                                                        title="Maddeyi Sil"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
                                            <div className="w-14 h-14 rounded-2xl bg-amber-950/50 border border-amber-800/40 flex items-center justify-center">
                                                <ListOrdered className="w-7 h-7 text-amber-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-white">Henüz Özet Not Eklenmedi</h4>
                                                <p className="text-xs text-slate-400 max-w-md">
                                                    Öğrencilerin deftere yazacağı özet notları yapay zeka ile ders kitabından çıkarabilir veya kendiniz yazabilirsiniz.
                                                </p>
                                            </div>
                                            <div className="flex gap-2.5">
                                                <Button
                                                    onClick={() => handleGenerateAi('notes')}
                                                    disabled={isGeneratingAi}
                                                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl"
                                                >
                                                    <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Notları Doldur
                                                </Button>
                                                <Button
                                                    onClick={handleAddNote}
                                                    variant="outline"
                                                    className="border-white/10 text-slate-300 text-xs rounded-xl"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Manuel Ekle
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 3. AKILLI TAHTA CANLI ÖNİZLEME SEKMESİ ── */}
                            {activeTab === 'smartboard' && (
                                <div ref={previewContainerRef} className="space-y-6 max-w-6xl mx-auto">
                                    {/* Önizleme Kontrol Çubuğu */}
                                    <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-white/10 flex-wrap gap-3">
                                        {/* KAVRAMLAR / NOTLAR Butonları */}
                                        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
                                            <button
                                                onClick={() => setPreviewSubTab('kavramlar')}
                                                className={cn(
                                                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                    previewSubTab === 'kavramlar'
                                                        ? "bg-cyan-600 text-white shadow-md"
                                                        : "text-slate-400 hover:text-white"
                                                )}
                                            >
                                                KAVRAMLAR ({editingConcepts.length})
                                            </button>
                                            <button
                                                onClick={() => setPreviewSubTab('notlar')}
                                                className={cn(
                                                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                    previewSubTab === 'notlar'
                                                        ? "bg-amber-600 text-white shadow-md"
                                                        : "text-slate-400 hover:text-white"
                                                )}
                                            >
                                                ÖNEMLİ NOTLAR ({editingNotes.length})
                                            </button>
                                        </div>

                                        {/* Boyut ve Eylemler */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-white/10">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setFontSize(s => Math.max(1.0, s - 0.15))}
                                                    className="h-8 w-8 text-slate-400 hover:text-white"
                                                    title="Yazı Boyutunu Küçült"
                                                >
                                                    A-
                                                </Button>
                                                <span className="text-[11px] font-mono font-bold text-slate-400 px-2">
                                                    {Math.round(fontSize * 100)}%
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setFontSize(s => Math.min(3.0, s + 0.15))}
                                                    className="h-8 w-8 text-slate-400 hover:text-white"
                                                    title="Yazı Boyutunu Büyüt"
                                                >
                                                    A+
                                                </Button>
                                            </div>

                                            <Button
                                                variant="outline"
                                                asChild
                                                size="sm"
                                                className="border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 hover:text-white rounded-xl text-xs font-bold"
                                            >
                                                <Link href={smartboardPlayUrl} target="_blank">
                                                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Tahtada Tam Ekran Aç
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Canlı Simülasyon Ekranı */}
                                    <div className="p-6 md:p-8 rounded-3xl bg-slate-950 border border-white/10 shadow-2xl relative min-h-[500px]">
                                        <h2 className="text-center font-black text-2xl md:text-3xl text-cyan-400 mb-6 uppercase tracking-wider drop-shadow-md">
                                            {activeTopic?.title || 'Kavram Panosu'}
                                        </h2>

                                        {/* KAVRAMLAR GÖRÜNÜMÜ */}
                                        {previewSubTab === 'kavramlar' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {editingConcepts.length > 0 ? (
                                                    editingConcepts.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                "relative overflow-hidden rounded-2xl border p-5 flex flex-col transition-all hover:scale-[1.02] shadow-xl backdrop-blur-md",
                                                                COLOR_CLASSES[idx % COLOR_CLASSES.length]
                                                            )}
                                                        >
                                                            {/* Arka Plan Büyük Sayı */}
                                                            <div className="absolute top-1 right-2 text-white/10 font-black text-6xl pointer-events-none select-none">
                                                                {idx + 1}
                                                            </div>
                                                            <h3
                                                                className="font-black text-white mb-2 border-b border-white/10 pb-2 uppercase tracking-wide relative z-10"
                                                                style={{ fontSize: `${fontSize * 1.15}rem` }}
                                                            >
                                                                {item.concept || 'Kavram Adı'}
                                                            </h3>
                                                            <p
                                                                className="font-medium text-white/90 leading-relaxed relative z-10 flex-1"
                                                                style={{ fontSize: `${fontSize * 0.95}rem` }}
                                                            >
                                                                {item.definition || 'Tanım açıklaması...'}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-full py-16 text-center text-slate-500 font-bold">
                                                        Kayıtlı kavram bulunamadı.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ÖNEMLİ NOTLAR GÖRÜNÜMÜ */}
                                        {previewSubTab === 'notlar' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {editingNotes.length > 0 ? (
                                                    editingNotes.map((note, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-start gap-4 p-5 rounded-2xl border-2 bg-slate-900/80 border-slate-700/60 shadow-xl transition-all hover:bg-slate-800/80"
                                                        >
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-lg flex items-center justify-center flex-shrink-0 shadow-lg border border-amber-400/30 mt-0.5">
                                                                {idx + 1}
                                                            </div>
                                                            <p
                                                                className="font-medium text-slate-200 leading-relaxed flex-1"
                                                                style={{ fontSize: `${fontSize}rem` }}
                                                            >
                                                                {note}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-full py-16 text-center text-slate-500 font-bold">
                                                        Kayıtlı özet not bulunamadı.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── 4. DERS KİTABI KAYNAK METNİ SEKMESİ ── */}
                            {activeTab === 'source' && (
                                <div className="space-y-4 max-w-5xl mx-auto">
                                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <span>Ders Kitabı Orijinal Kaynak Metni</span>
                                                {activeTopic?.sourceText && (
                                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
                                                        {activeTopic.sourceText.trim().split(/\s+/).length} Kelime
                                                    </Badge>
                                                )}
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Kavramlar ve notlar bu metinden sentezlenir. Dilerseniz metni okuyup yeni kavramlar ekleyebilirsiniz.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleGenerateAi('all')}
                                            disabled={isGeneratingAi || !activeTopic?.sourceText}
                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Metinden Kavram & Not Çıkar
                                        </Button>
                                    </div>

                                    {activeTopic?.sourceText ? (
                                        <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-200 text-sm leading-relaxed whitespace-pre-line font-sans select-text">
                                            {activeTopic.sourceText}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-slate-500 bg-slate-950/30 rounded-2xl border border-dashed border-white/10">
                                            Bu konu için henüz ders kitabı kaynak metni girilmemiş.
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

export default function YazilacaklarStudioPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            </div>
        }>
            <YazilacaklarStudioContent />
        </Suspense>
    );
}
