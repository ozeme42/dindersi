'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Columns, BookOpen, Search, Sparkles, Check, ChevronLeft, ChevronRight,
    Loader2, Save, Wand2, ArrowLeft, Download, Plus, Trash2, Maximize,
    Minimize, ExternalLink, RefreshCw, Layers, BookMarked, Eye, LayoutTemplate,
    ListOrdered, FileText, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle,
    Tag, HelpCircle, AlignLeft, X, Copy, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    loadAllYazilacaklarData,
    saveCentralActivityDataAction,
    generateCentralActivityAiAction,
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

function CentralActivityStudioContent() {
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

    // Studio Tabs: 'concepts' | 'definitions' | 'sentences' | 'smartboard' | 'source'
    const [activeTab, setActiveTab] = useState<'concepts' | 'definitions' | 'sentences' | 'smartboard' | 'source'>('definitions');

    // ── EDITING STATES FOR ALL 3 ACTIVITY TYPES ──
    // 1. Single Words / Concepts (Kelime Havuzu)
    const [editingConcepts, setEditingConcepts] = useState<string[]>([]);
    const [newConceptInput, setNewConceptInput] = useState<string>('');

    // 2. Concept - Definition Pairs (Kavram-Tanım Eşleşmeli)
    const [editingDefinitions, setEditingDefinitions] = useState<ConceptItem[]>([]);

    // 3. Sentences / Notes (Özet Cümleler & Defter Notları)
    const [editingSentences, setEditingSentences] = useState<string[]>([]);

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
                    toast({ title: "Veriler Güncellendi", description: "Etkinlik Veri Bankası ve Kavram Panosu verileri yüklendi." });
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

    // Parse URL query parameters on initial load
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const courseParam = params.get('courseId') || params.get('course');
        const unitParam = params.get('unitId') || params.get('unit');
        const topicParam = params.get('topicId') || params.get('topic');
        const tabParam = params.get('tab');

        if (tabParam === 'concepts' || tabParam === 'definitions' || tabParam === 'sentences' || tabParam === 'smartboard' || tabParam === 'source') {
            setActiveTab(tabParam as any);
        }

        if (topicParam) {
            setSelectedTopicId(topicParam);
            if (courseParam) setSelectedCourseId(courseParam);
            if (unitParam) setSelectedUnitId(unitParam);
            setIsSidebarOpen(false); // Doğrudan linkle gelindiğinde geniş ekran açılsın
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
            setEditingConcepts(activeTopic.concepts || []);
            setEditingDefinitions(activeTopic.conceptDefinitions || []);
            setEditingSentences(activeTopic.sentences || []);
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

    // Global Search Matches (across all grades, topics, concepts, definitions, sentences)
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        return items.filter(i =>
            i.title.toLowerCase().includes(q) ||
            i.unitTitle.toLowerCase().includes(q) ||
            i.courseTitle.toLowerCase().includes(q) ||
            i.className.toLowerCase().includes(q) ||
            i.concepts.some(c => c.toLowerCase().includes(q)) ||
            i.conceptDefinitions.some(d => d.concept.toLowerCase().includes(q) || d.definition.toLowerCase().includes(q)) ||
            i.sentences.some(s => s.toLowerCase().includes(q))
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

    // ── 1. KAVRAMLAR (KELİME HAVUZU) EYLEMLERİ ──
    const handleAddConceptWord = () => {
        const trimmed = newConceptInput.trim();
        if (!trimmed) return;
        // Virgülle veya satırla ayrılmış çoklu kelime desteği
        const splitWords = trimmed.split(/[,;\n]+/).map(w => w.trim()).filter(Boolean);
        setEditingConcepts(prev => {
            const next = [...prev];
            splitWords.forEach(w => {
                if (!next.includes(w)) next.push(w);
            });
            return next;
        });
        setNewConceptInput('');
        setHasUnsavedChanges(true);
    };

    const handleRemoveConceptWord = (index: number) => {
        setEditingConcepts(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // ── 2. KAVRAM-TANIM EŞLEŞMELİ EYLEMLERİ ──
    const handleDefinitionChange = (index: number, field: 'concept' | 'definition', val: string) => {
        setEditingDefinitions(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: val };
            return copy;
        });
        setHasUnsavedChanges(true);
    };

    const handleAddDefinition = () => {
        setEditingDefinitions(prev => [...prev, { concept: '', definition: '' }]);
        setHasUnsavedChanges(true);
    };

    const handleRemoveDefinition = (index: number) => {
        setEditingDefinitions(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // ── 3. ÖZET CÜMLELER EYLEMLERİ ──
    const handleSentenceChange = (index: number, val: string) => {
        setEditingSentences(prev => {
            const copy = [...prev];
            copy[index] = val;
            return copy;
        });
        setHasUnsavedChanges(true);
    };

    const handleAddSentence = () => {
        setEditingSentences(prev => [...prev, '']);
        setHasUnsavedChanges(true);
    };

    const handleRemoveSentence = (index: number) => {
        setEditingSentences(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // ── MERKEZİ KAYIT (TAM SENKRONİZASYON) ──
    const handleSave = async () => {
        if (!activeTopic) return;
        setIsSaving(true);
        try {
            const res = await saveCentralActivityDataAction({
                courseId: activeTopic.courseId,
                unitId: activeTopic.unitId,
                topicId: activeTopic.topicId,
                concepts: editingConcepts,
                conceptDefinitions: editingDefinitions,
                sentences: editingSentences
            });

            if (res.success) {
                // Update local items state
                setItems(prev => prev.map(item => {
                    if (item.topicId === activeTopic.topicId) {
                        return {
                            ...item,
                            concepts: editingConcepts.filter(c => c.trim().length > 0),
                            conceptDefinitions: editingDefinitions.filter(d => d.concept.trim() || d.definition.trim()),
                            sentences: editingSentences.filter(s => s.trim().length > 0),
                            conceptsCount: editingConcepts.length,
                            definitionsCount: editingDefinitions.length,
                            sentencesCount: editingSentences.length,
                            hasContent: editingConcepts.length > 0 || editingDefinitions.length > 0 || editingSentences.length > 0
                        };
                    }
                    return item;
                }));
                setHasUnsavedChanges(false);
                toast({
                    title: "Tüm Sistemlere Senkronize Kaydedildi! ⚡",
                    description: `"${activeTopic.title}" konusuna ait ${editingConcepts.length} kavram, ${editingDefinitions.length} tanım ve ${editingSentences.length} cümle; hem Kavram Panosu'na hem Etkinlik Veri Bankası'na ve tüm oyunlara anında aktarıldı.`
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

    // ── AI İLE ÜRETİM ──
    const handleGenerateAi = async (mode: 'all' | 'concepts' | 'definitions' | 'sentences' = 'all') => {
        if (!activeTopic) return;
        setIsGeneratingAi(true);
        setAiDropdownOpen(false);
        try {
            const res = await generateCentralActivityAiAction({
                sourceText: activeTopic.sourceText,
                topicTitle: activeTopic.title,
                grade: activeTopic.grade,
                courseTitle: activeTopic.courseTitle,
                mode: mode
            });

            if (res.success) {
                if (mode === 'all' || mode === 'concepts') {
                    if (res.concepts && res.concepts.length > 0) {
                        setEditingConcepts(res.concepts);
                    }
                }
                if (mode === 'all' || mode === 'definitions') {
                    if (res.conceptDefinitions && res.conceptDefinitions.length > 0) {
                        setEditingDefinitions(res.conceptDefinitions);
                    }
                }
                if (mode === 'all' || mode === 'sentences') {
                    if (res.sentences && res.sentences.length > 0) {
                        setEditingSentences(res.sentences);
                    }
                }
                setHasUnsavedChanges(true);
                toast({
                    title: "Yapay Zeka İçerikleri Hazırladı! ✨",
                    description: "Kavramlar, tanımlar ve cümleler çıkarıldı. Beğendiyseniz 'Kaydet' butonuna basarak tüm sistemlere tek tıkla senkronize edebilirsiniz."
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
                    <title>${activeTopic.title} - Kavramlar, Tanımlar ve Notlar</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 20px; }
                        .badge { display: inline-block; background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 13px; margin-bottom: 8px; }
                        h1 { font-size: 26px; font-weight: 800; margin: 0; color: #0f172a; }
                        .hierarchy { font-size: 14px; color: #64748b; margin-top: 6px; }
                        h2 { font-size: 20px; font-weight: 700; color: #4338ca; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-top: 28px; }
                        .words-cloud { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
                        .word-chip { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 8px; font-weight: 700; font-size: 13px; color: #334155; }
                        .concepts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 14px; }
                        .concept-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; background: #f8fafc; page-break-inside: avoid; }
                        .concept-name { font-weight: 800; font-size: 16px; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; }
                        .concept-def { font-size: 14px; color: #334155; }
                        .notes-list { list-style: none; padding: 0; margin-top: 14px; }
                        .note-item { display: flex; gap: 12px; margin-bottom: 12px; page-break-inside: avoid; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; }
                        .note-number { width: 26px; height: 26px; border-radius: 8px; background: #d97706; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; flex-shrink: 0; }
                        .note-text { font-size: 14px; font-weight: 600; color: #1e293b; }
                        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                        @media print { body { padding: 20px; } }
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
                htmlContent += `<h2>🏷️ Anahtar Kavramlar / Kelimeler</h2><div class="words-cloud">`;
                editingConcepts.forEach(w => {
                    htmlContent += `<span class="word-chip">${w}</span>`;
                });
                htmlContent += `</div>`;
            }

            if (editingDefinitions.length > 0) {
                htmlContent += `<h2>📖 Kavram - Tanım Eşleşmeleri</h2><div class="concepts-grid">`;
                editingDefinitions.forEach(c => {
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

            if (editingSentences.length > 0) {
                htmlContent += `<h2>✍️ Özet Cümleler & Notlar</h2><div class="notes-list">`;
                editingSentences.forEach((s, idx) => {
                    if (s.trim()) {
                        htmlContent += `
                            <div class="note-item">
                                <div class="note-number">${idx + 1}</div>
                                <div class="note-text">${s}</div>
                            </div>
                        `;
                    }
                });
                htmlContent += `</div>`;
            }

            htmlContent += `
                    <div class="footer">
                        Din Dersi Atölyesi • Merkezi Etkinlik & Kavram Stüdyosu • ${new Date().toLocaleDateString('tr-TR')}
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

    if (isLoading && items.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                    <p className="text-slate-400 font-bold text-lg">Merkezi Etkinlik & Kavram Stüdyosu Yükleniyor...</p>
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
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-900/40 border border-purple-400/30 flex-shrink-0">
                            <Columns className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    Merkezi Etkinlik & Kavram Stüdyosu
                                </h1>
                                <Badge className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border-purple-400/30 text-[10px] font-mono">
                                    TAM SENKRON
                                </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-400 font-medium">
                                Kelimeleri, kavram-tanım eşleşmelerini ve özet cümleleri tek merkezden yönetin; oyunlara anında yansısın.
                            </p>
                        </div>
                    </div>

                    {/* Arama Çubuğu & Butonlar */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Global Arama */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                                placeholder="Kavram, tanım veya cümle ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-slate-950/70 border-white/10 text-xs rounded-xl focus:border-purple-500 text-white placeholder:text-slate-500"
                            />
                            {/* Arama Sonuçları */}
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
                                                    <span className="text-[9px] bg-blue-950 border border-blue-800 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                                                        {res.conceptsCount} K.
                                                    </span>
                                                )}
                                                {res.definitionsCount > 0 && (
                                                    <span className="text-[9px] bg-purple-950 border border-purple-800 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                                                        {res.definitionsCount} T.
                                                    </span>
                                                )}
                                                {res.sentencesCount > 0 && (
                                                    <span className="text-[9px] bg-amber-950 border border-amber-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                                                        {res.sentencesCount} C.
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
                                className="rounded-xl h-10 px-3.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-90 text-white shadow-lg shadow-purple-950/50 flex items-center gap-1.5"
                            >
                                {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4 text-pink-200" />}
                                <span>AI İle Üret</span>
                            </Button>

                            {aiDropdownOpen && (
                                <div className="absolute right-0 top-12 bg-slate-900 border border-white/20 rounded-2xl p-2 shadow-2xl z-50 w-60 space-y-1">
                                    <button
                                        onClick={() => handleGenerateAi('all')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-purple-600/40 flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4 text-yellow-400" />
                                        <span>Tümünü Üret (3'ü 1 Arada)</span>
                                    </button>
                                    <button
                                        onClick={() => handleGenerateAi('concepts')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-blue-300 hover:bg-blue-600/30 flex items-center gap-2"
                                    >
                                        <Tag className="w-4 h-4 text-blue-400" />
                                        <span>Yalnızca Kavramları (Kelimeleri) Çıkar</span>
                                    </button>
                                    <button
                                        onClick={() => handleGenerateAi('definitions')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-purple-300 hover:bg-purple-600/30 flex items-center gap-2"
                                    >
                                        <Columns className="w-4 h-4 text-purple-400" />
                                        <span>Yalnızca Kavram-Tanım Çiftlerini Üret</span>
                                    </button>
                                    <button
                                        onClick={() => handleGenerateAi('sentences')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-600/30 flex items-center gap-2"
                                    >
                                        <ListOrdered className="w-4 h-4 text-amber-400" />
                                        <span>Yalnızca Özet Cümleleri Üret</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Kaydet Butonu (Merkezi Senkron) */}
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
                            <span>{hasUnsavedChanges ? "Kaydet & Senkronize Et" : "Kaydet"}</span>
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
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-8 px-2 text-xs flex items-center gap-1 border border-white/10 ml-1"
                                        title="Fihristi Gizle"
                                    >
                                        <PanelLeftClose className="w-4 h-4 text-purple-400" />
                                        <span className="hidden sm:inline">Gizle</span>
                                    </Button>
                                </div>
                            </div>

                            {/* 4 Kolon Konteyneri */}
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

                                {/* KOLON 4: Konular (Seçilince Otomatik Kapanır) */}
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
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {topic.conceptsCount > 0 && (
                                                            <span className={cn("text-[9px] px-1 py-0.2 rounded font-mono font-bold", isSelected ? "bg-purple-800 text-purple-200" : "bg-blue-950 border border-blue-800 text-blue-300")} title={`${topic.conceptsCount} Kelime Kavram`}>
                                                                {topic.conceptsCount} K
                                                            </span>
                                                        )}
                                                        {topic.definitionsCount > 0 && (
                                                            <span className={cn("text-[9px] px-1 py-0.2 rounded font-mono font-bold", isSelected ? "bg-purple-800 text-purple-200" : "bg-purple-950 border border-purple-800 text-purple-300")} title={`${topic.definitionsCount} Tanım`}>
                                                                {topic.definitionsCount} T
                                                            </span>
                                                        )}
                                                        {topic.sentencesCount > 0 && (
                                                            <span className={cn("text-[9px] px-1 py-0.2 rounded font-mono font-bold", isSelected ? "bg-purple-800 text-purple-200" : "bg-amber-950 border border-amber-800 text-amber-300")} title={`${topic.sentencesCount} Cümle`}>
                                                                {topic.sentencesCount} C
                                                            </span>
                                                        )}
                                                        {!topic.hasContent && (
                                                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-500">
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

                    {/* ── SAĞ PANEL: DİJİTAL ÇALIŞMA MASASI & MERKEZİ STÜDYO ── */}
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

                        {/* ══ STÜDYO 5 TEMEL ÇALIŞMA SEKMESİ ══ */}
                        <div className="px-4 py-2.5 bg-slate-950/50 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-white/10 flex-wrap">
                                
                                {/* Sekme 1: Kavramlar (Kelime Havuzu) */}
                                <button
                                    onClick={() => setActiveTab('concepts')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'concepts'
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-950/40"
                                            : "text-blue-400 hover:text-white"
                                    )}
                                >
                                    <Tag className="w-3.5 h-3.5" />
                                    <span>1. Kavramlar (Kelimeler)</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded font-bold">
                                        {editingConcepts.length}
                                    </span>
                                </button>

                                {/* Sekme 2: Kavram-Tanım Eşleşmeli */}
                                <button
                                    onClick={() => setActiveTab('definitions')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'definitions'
                                            ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                                            : "text-purple-400 hover:text-white"
                                    )}
                                >
                                    <Columns className="w-3.5 h-3.5" />
                                    <span>2. Kavram-Tanım Eşleşmeli</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded font-bold">
                                        {editingDefinitions.length}
                                    </span>
                                </button>

                                {/* Sekme 3: Özet Cümleler */}
                                <button
                                    onClick={() => setActiveTab('sentences')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'sentences'
                                            ? "bg-amber-600 text-white shadow-md shadow-amber-950/40"
                                            : "text-amber-400 hover:text-white"
                                    )}
                                >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                    <span>3. Özet Cümleler & Notlar</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded font-bold">
                                        {editingSentences.length}
                                    </span>
                                </button>

                                {/* Sekme 4: Akıllı Tahta Önizleme */}
                                <button
                                    onClick={() => setActiveTab('smartboard')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'smartboard'
                                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/40"
                                            : "text-cyan-300 hover:text-white"
                                    )}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>4. Akıllı Tahta Önizleme</span>
                                </button>

                                {/* Sekme 5: Ders Kitabı Metni */}
                                <button
                                    onClick={() => setActiveTab('source')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'source'
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                                            : "text-emerald-400 hover:text-white"
                                    )}
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>5. Ders Kitabı Metni</span>
                                    {activeTopic?.sourceText && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded">
                                            {activeTopic.sourceText.trim().split(/\s+/).length} kelime
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Değişiklik Bildirimi */}
                            {hasUnsavedChanges && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/50 px-3 py-1 rounded-xl">
                                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                    <span>Kaydedilmemiş değişiklikler var</span>
                                </div>
                            )}
                        </div>

                        {/* ══ SEKME İÇERİKLERİ ══ */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">

                            {/* ── 1. KAVRAMLAR (KELİME HAVUZU) SEKMESİ ── */}
                            {activeTab === 'concepts' && (
                                <div className="space-y-5 max-w-5xl mx-auto">
                                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <span>Anahtar Kavramlar & Kelime Havuzu</span>
                                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px]">
                                                    {editingConcepts.length} Kelime
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Anlat Bakalım, Anagram Duvarı, Çarkıfelek ve Kelime Avı gibi oyunlarda doğrudan kullanılan kavramlar.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleGenerateAi('concepts')}
                                            disabled={isGeneratingAi || !activeTopic}
                                            variant="outline"
                                            size="sm"
                                            className="border-blue-500/30 text-blue-300 hover:bg-blue-950/50 hover:text-white rounded-xl text-xs"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Kelimeleri Çıkar
                                        </Button>
                                    </div>

                                    {/* Hızlı Kelime Ekleme Girişi */}
                                    <div className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-2xl border border-white/10">
                                        <Input
                                            placeholder="Yeni kavram veya virgülle çoklu kelime yazın (Örn: Tevhid, İhlas, Rahman, Kıble)..."
                                            value={newConceptInput}
                                            onChange={(e) => setNewConceptInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddConceptWord()}
                                            className="bg-slate-950/60 border-white/10 text-xs font-semibold text-white rounded-xl h-10"
                                        />
                                        <Button
                                            onClick={handleAddConceptWord}
                                            disabled={!newConceptInput.trim()}
                                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl h-10 px-4 text-xs font-bold flex-shrink-0"
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Ekle
                                        </Button>
                                    </div>

                                    {/* Kelime Çipleri / Etiketleri */}
                                    {editingConcepts.length > 0 ? (
                                        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-3">
                                            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2">
                                                <span>Kayıtlı Kelimeler (Silmek için çarpıya tıklayabilirsiniz):</span>
                                                <button
                                                    onClick={() => { setEditingConcepts([]); setHasUnsavedChanges(true); }}
                                                    className="text-red-400 hover:underline text-[11px]"
                                                >
                                                    Tümünü Temizle
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
                                                {editingConcepts.map((word, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="group bg-blue-950/60 border border-blue-500/40 hover:border-blue-400 text-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                                                    >
                                                        <span className="text-[10px] text-blue-400/60 font-mono">#{idx + 1}</span>
                                                        <span>{word}</span>
                                                        <button
                                                            onClick={() => handleRemoveConceptWord(idx)}
                                                            className="text-blue-400/50 hover:text-red-400 transition-colors p-0.5"
                                                            title="Kavramı Kaldır"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-dashed border-white/10 space-y-3">
                                            <Tag className="w-10 h-10 text-blue-400 mx-auto opacity-40" />
                                            <p className="text-slate-400 text-xs font-medium">
                                                Bu konu için henüz tekil kavram kelimesi eklenmemiş. Yukarıdaki giriş alanından ekleyebilir veya AI ile çıkarabilirsiniz.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 2. KAVRAM-TANIM EŞLEŞMELİ SEKMESİ ── */}
                            {activeTab === 'definitions' && (
                                <div className="space-y-4 max-w-5xl mx-auto">
                                    <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-2xl border border-white/10">
                                        <div>
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <span>Kavram - Tanım Eşleşmeli İçerikler</span>
                                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px]">
                                                    {editingDefinitions.length} Çift
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Kavram Düellosu, Hafıza Kartları, Eşleştirme ve Akıllı Tahta Kavram Panosu'nda soru-cevap olarak kullanılır.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleGenerateAi('definitions')}
                                                disabled={isGeneratingAi || !activeTopic}
                                                variant="outline"
                                                size="sm"
                                                className="border-purple-500/30 text-purple-300 hover:bg-purple-950/50 hover:text-white rounded-xl text-xs"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Tanım Üret
                                            </Button>
                                            <Button
                                                onClick={handleAddDefinition}
                                                size="sm"
                                                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Yeni Kavram-Tanım Ekle
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Tanım Kartları */}
                                    {editingDefinitions.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            {editingDefinitions.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-slate-900/90 border border-white/10 hover:border-purple-500/40 rounded-2xl p-4 transition-all space-y-2.5 relative group"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <span className="w-6 h-6 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 flex items-center justify-center text-xs font-mono font-bold">
                                                                {idx + 1}
                                                            </span>
                                                            <Input
                                                                placeholder="Kavram / Terim Adı (Örn: Evren, Tevhid)"
                                                                value={item.concept}
                                                                onChange={(e) => handleDefinitionChange(idx, 'concept', e.target.value)}
                                                                className="h-8 bg-slate-950/70 border-white/10 font-bold text-white text-xs focus:border-purple-400 rounded-lg"
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveDefinition(idx)}
                                                            className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg"
                                                            title="Tanımı Sil"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                    <Textarea
                                                        placeholder="Kavramın açıklaması ve tanımı (Tanımda kavramın adı geçmemelidir)..."
                                                        value={item.definition}
                                                        onChange={(e) => handleDefinitionChange(idx, 'definition', e.target.value)}
                                                        rows={2}
                                                        className="bg-slate-950/50 border-white/10 text-xs text-slate-300 focus:border-purple-400 rounded-xl leading-relaxed"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
                                            <Columns className="w-10 h-10 text-purple-400 mx-auto opacity-40" />
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-white">Henüz Kavram-Tanım Eklenmedi</h4>
                                                <p className="text-xs text-slate-400 max-w-md">
                                                    Bu konu için yapay zeka ile kaynak metinden kavram-tanım çiftlerini otomatik çıkarabilir veya kendiniz ekleyebilirsiniz.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => handleGenerateAi('definitions')}
                                                disabled={isGeneratingAi}
                                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Tanımları Üret
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 3. ÖZET CÜMLELER & NOTLAR SEKMESİ ── */}
                            {activeTab === 'sentences' && (
                                <div className="space-y-4 max-w-5xl mx-auto">
                                    <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-2xl border border-white/10">
                                        <div>
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <span>Özet Cümleler & Defter Notları</span>
                                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px]">
                                                    {editingSentences.length} Cümle
                                                </Badge>
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Doğru-Yanlış Zinciri, Cümle Kurma oyunlarında ve tahtadan deftere yazdırılan notlarda kullanılır.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => handleGenerateAi('sentences')}
                                                disabled={isGeneratingAi || !activeTopic}
                                                variant="outline"
                                                size="sm"
                                                className="border-amber-500/30 text-amber-300 hover:bg-amber-950/50 hover:text-white rounded-xl text-xs"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Cümleleri Doldur
                                            </Button>
                                            <Button
                                                onClick={handleAddSentence}
                                                size="sm"
                                                className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Yeni Cümle Ekle
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Cümleler Listesi */}
                                    {editingSentences.length > 0 ? (
                                        <div className="space-y-3">
                                            {editingSentences.map((sentence, idx) => (
                                                <div
                                                    key={idx}
                                                    className="bg-slate-900/90 border border-white/10 hover:border-amber-500/40 rounded-2xl p-3.5 transition-all flex items-start gap-3 group"
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md mt-1">
                                                        {idx + 1}
                                                    </div>
                                                    <Textarea
                                                        placeholder={`Özet cümle maddesi ${idx + 1}...`}
                                                        value={sentence}
                                                        onChange={(e) => handleSentenceChange(idx, e.target.value)}
                                                        rows={2}
                                                        className="bg-slate-950/60 border-white/10 text-xs font-medium text-slate-200 focus:border-amber-400 rounded-xl leading-relaxed flex-1"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveSentence(idx)}
                                                        className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl flex-shrink-0 mt-1"
                                                        title="Cümleyi Sil"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
                                            <ListOrdered className="w-10 h-10 text-amber-400 mx-auto opacity-40" />
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-white">Henüz Özet Cümle Eklenmedi</h4>
                                                <p className="text-xs text-slate-400 max-w-md">
                                                    Öğrencilerin deftere yazacağı veya oyunlarda kullanılacak özet cümleleri yapay zeka ile çıkarabilirsiniz.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={() => handleGenerateAi('sentences')}
                                                disabled={isGeneratingAi}
                                                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Cümleleri Üret
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 4. AKILLI TAHTA CANLI ÖNİZLEME SEKMESİ ── */}
                            {activeTab === 'smartboard' && (
                                <div ref={previewContainerRef} className="space-y-6 max-w-6xl mx-auto">
                                    <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-2xl border border-white/10 flex-wrap gap-3">
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
                                                KAVRAMLAR ({editingDefinitions.length})
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
                                                ÖNEMLİ NOTLAR ({editingSentences.length})
                                            </button>
                                        </div>

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

                                    {/* Canlı Simülasyon */}
                                    <div className="p-6 md:p-8 rounded-3xl bg-slate-950 border border-white/10 shadow-2xl relative min-h-[500px]">
                                        <h2 className="text-center font-black text-2xl md:text-3xl text-cyan-400 mb-6 uppercase tracking-wider drop-shadow-md">
                                            {activeTopic?.title || 'Kavram Panosu'}
                                        </h2>

                                        {previewSubTab === 'kavramlar' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {editingDefinitions.length > 0 ? (
                                                    editingDefinitions.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={cn(
                                                                "relative overflow-hidden rounded-2xl border p-5 flex flex-col transition-all hover:scale-[1.02] shadow-xl backdrop-blur-md",
                                                                COLOR_CLASSES[idx % COLOR_CLASSES.length]
                                                            )}
                                                        >
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
                                                        Kayıtlı tanım bulunamadı.
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {previewSubTab === 'notlar' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {editingSentences.length > 0 ? (
                                                    editingSentences.map((sentence, idx) => (
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
                                                                {sentence}
                                                            </p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-full py-16 text-center text-slate-500 font-bold">
                                                        Kayıtlı özet cümle bulunamadı.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── 5. DERS KİTABI KAYNAK METNİ SEKMESİ ── */}
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
                                                Kavramlar, tanımlar ve cümleler bu orijinal ders kitabı metninden beslenir.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleGenerateAi('all')}
                                            disabled={isGeneratingAi || !activeTopic?.sourceText}
                                            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold rounded-xl"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Metinden Hepsini Üret (3'ü 1 Arada)
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

export default function CentralActivityStudioPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            </div>
        }>
            <CentralActivityStudioContent />
        </Suspense>
    );
}
