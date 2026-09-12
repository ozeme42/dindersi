'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { 
    LayoutTemplate, BookOpen, Search, Home, ArrowLeft,
    Trash2, Copy, Check, Eye, Sparkles, Loader2, Layers,
    FileText, AlertCircle, ChevronRight, ChevronLeft, X,
    RefreshCw, GraduationCap, Maximize2, Minimize2, Plus,
    Minus, Wand2, MonitorPlay, Code2, BookmarkCheck, CheckCircle2,
    SlidersHorizontal, ArrowUpDown, BookMarked, Sparkle,
    Zap, Columns, ExternalLink, CheckCircle, HelpCircle,
    FileUp, Eraser, FileCheck, Edit3, Save, RotateCcw,
    Book as BookIcon, FolderPlus, Library,
    Key, Settings2, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
    loadAllOzetlerData, 
    saveOzetContent, 
    clearOzetContent, 
    generateOzetWithAi, 
    batchGenerateUnitTopicSummaries,
    saveItemSourceText,
    cleanAndFormatSourceTextWithAi,
    type OzetItem 
} from './actions';
import { saveSystemAiConfigAction, getSystemAiConfigAction } from '@/ai/ai-config-service';
import { loadPdf, extractTextFromPageRange } from '@/lib/pdf-text-extractor';

// ══ GEMINI MODELLERİ ══
const FREE_GEMINI_MODELS = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    tag: '🚀 En Yeni Nesil (2026)',
    desc: 'Google’ın en gelişmiş hibrit akıl yürütme ve zengin içerik sentezi modeli.',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tag: '💡 Yüksek Performans',
    desc: 'Pedagojik içerik ve kaliteli özet üretimi için dengeli model.',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    tag: '⚡ Ultra Düşük Gecikme',
    desc: 'Hızlı özet üretimi için optimize edilmiş hafif model.',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    tag: '🔄 Otomatik Güncel',
    desc: 'Her zaman en son kararlı Flash sürümünü otomatik çalıştırır.',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    tag: '🧠 Derin Muhakeme & Analiz',
    desc: 'Akademik ve derinlikli ders kitabı sentezi ve kavram haritası için.',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }
];


// Sınıflara Özel Canlı Renk Temaları (İçerik Yönetimi ile %100 Birebir)
const classBadgeThemes: Record<string, { active: string; idle: string; border: string }> = {
    '4': {
        active: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-emerald-300 ring-2 ring-emerald-400/60',
        idle: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400',
        border: 'border-emerald-500/40',
    },
    '5': {
        active: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border-cyan-300 ring-2 ring-cyan-400/60',
        idle: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/60 hover:border-cyan-400',
        border: 'border-cyan-500/40',
    },
    '6': {
        active: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-emerald-300 ring-2 ring-emerald-400/60',
        idle: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60 hover:border-emerald-400',
        border: 'border-emerald-500/40',
    },
    '7': {
        active: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] border-violet-300 ring-2 ring-violet-400/60',
        idle: 'bg-violet-950/40 text-violet-300 border-violet-500/30 hover:bg-violet-900/60 hover:border-violet-400',
        border: 'border-violet-500/40',
    },
    '8': {
        active: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] border-amber-300 ring-2 ring-amber-400/60',
        idle: 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:bg-amber-900/60 hover:border-amber-400',
        border: 'border-amber-500/40',
    },
};

const defaultClassTheme = {
    active: 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg border-white/30 ring-2 ring-white/40',
    idle: 'bg-slate-900/50 text-slate-300 border-white/10 hover:bg-slate-800/60 hover:border-white/20',
    border: 'border-white/10',
};

const courseGradients = [
    { active: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] border-purple-400 ring-1 ring-purple-300', idle: 'bg-purple-950/40 text-purple-200 border-purple-500/30 hover:bg-purple-900/50' },
    { active: 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)] border-teal-400 ring-1 ring-teal-300', idle: 'bg-teal-950/40 text-teal-200 border-teal-500/30 hover:bg-teal-900/50' },
    { active: 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border-rose-400 ring-1 ring-rose-300', idle: 'bg-rose-950/40 text-rose-200 border-rose-500/30 hover:bg-rose-900/50' },
    { active: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] border-amber-400 ring-1 ring-amber-300', idle: 'bg-amber-950/40 text-amber-200 border-amber-500/30 hover:bg-amber-900/50' },
];

function extractLeadingNumbers(title: string): number[] {
    if (!title) return [];
    const clean = title.trim();
    const uniteMatch = clean.match(/^Ünite\s+(\d+)/i);
    if (uniteMatch) return [parseInt(uniteMatch[1], 10)];
    const match = clean.match(/^(\d+(?:[\.\-]\d+)*)/);
    if (match) return match[1].split(/[\.\-]/).filter(Boolean).map(n => parseInt(n, 10));
    return [];
}

function compareTitles(titleA: string = '', titleB: string = ''): number {
    const numsA = extractLeadingNumbers(titleA);
    const numsB = extractLeadingNumbers(titleB);
    if (numsA.length > 0 && numsB.length > 0) {
        for (let i = 0; i < Math.max(numsA.length, numsB.length); i++) {
            const a = numsA[i] ?? 0;
            const b = numsB[i] ?? 0;
            if (a !== b) return a - b;
        }
    } else if (numsA.length > 0) return -1;
    else if (numsB.length > 0) return 1;
    return titleA.localeCompare(titleB, 'tr', { numeric: true, sensitivity: 'base' });
}

export default function OzetlerManagementPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [items, setItems] = useState<OzetItem[]>([]);

    // Model ve API Ayarları
    const [showModelSettings, setShowModelSettings] = useState(false);
    const [apiKey, setApiKey] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('custom_gemini_api_key') || '';
        }
        return '';
    });
    const [selectedModel, setSelectedModel] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('custom_gemini_model') || 'gemini-3.7-flash';
        }
        return 'gemini-3.7-flash';
    });
    const [customModelInput, setCustomModelInput] = useState('');
    const [isCustomModel, setIsCustomModel] = useState(false);
    const [showApiKeyText, setShowApiKeyText] = useState(false);
    const [isSavingSystemKey, setIsSavingSystemKey] = useState(false);
    const [isKeySaved, setIsKeySaved] = useState(false);

    const activeModelId = isCustomModel ? (customModelInput.trim() || 'gemini-3.7-flash') : selectedModel;

    // Load saved system AI config if localStorage is empty
    useEffect(() => {
        getSystemAiConfigAction().then((cfg) => {
            if (cfg) {
                if (typeof window !== 'undefined' && !localStorage.getItem('custom_gemini_api_key') && cfg.apiKey) {
                    setApiKey(cfg.apiKey);
                }
                if (typeof window !== 'undefined' && !localStorage.getItem('custom_gemini_model') && cfg.modelName) {
                    setSelectedModel(cfg.modelName);
                }
            }
        }).catch(() => {});
    }, []);

    const handleUpdateApiKey = (newKey: string) => {
        setApiKey(newKey);
        if (typeof window !== 'undefined') {
            localStorage.setItem('custom_gemini_api_key', newKey.trim());
        }
    };

    const handleUpdateModel = (modelId: string) => {
        setSelectedModel(modelId);
        setIsCustomModel(false);
        if (typeof window !== 'undefined') {
            localStorage.setItem('custom_gemini_model', modelId);
        }
    };

    const handleSaveAiConfigGlobally = async () => {
        setIsSavingSystemKey(true);
        try {
            const trimmedKey = apiKey.trim();
            const trimmedModel = activeModelId;

            if (typeof window !== 'undefined') {
                localStorage.setItem('custom_gemini_api_key', trimmedKey);
                localStorage.setItem('custom_gemini_model', trimmedModel);
            }

            const result = await saveSystemAiConfigAction({
                apiKey: trimmedKey,
                modelName: trimmedModel,
            });

            setIsKeySaved(true);
            setTimeout(() => setIsKeySaved(false), 3000);

            toast({
                title: "Sisteme Kalıcı Kaydedildi",
                description: result.message,
            });
        } catch (error: any) {
            toast({
                title: "Kayıt Hatası",
                description: error.message || "API ayarları kaydedilemedi.",
                variant: "destructive",
            });
        } finally {
            setIsSavingSystemKey(false);
        }
    };

    // Cockpit Selections
    const [selectedGrade, setSelectedGrade] = useState<string>('5');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>([]); // Varsayılan olarak kapalı!
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'has_ozet' | 'missing_ozet' | 'has_source' | 'missing_source'>('all');

    // Studio Workspace Modal State (Seçilen konu/ünite için tam ekran stüdyo)
    const [activeSelectedItem, setActiveSelectedItem] = useState<OzetItem | null>(null);
    const [activeTab, setActiveTab] = useState<'source' | 'preview' | 'split' | 'code'>('preview');
    const [zoomLevel, setZoomLevel] = useState<number>(1.0);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const readerContainerRef = useRef<HTMLDivElement>(null);

    // Source Text Editing State
    const [isEditingSource, setIsEditingSource] = useState<boolean>(false);
    const [sourceEditText, setSourceEditText] = useState<string>('');
    const [isSavingSource, setIsSavingSource] = useState<boolean>(false);
    const [isAiCleaningSource, setIsAiCleaningSource] = useState<boolean>(false);
    const [copiedSource, setCopiedSource] = useState<boolean>(false);

    // PDF Assistant State
    const [isPdfAssistantOpen, setIsPdfAssistantOpen] = useState<boolean>(false);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [pdfFileName, setPdfFileName] = useState<string>('');
    const [pdfTotalPages, setPdfTotalPages] = useState<number>(0);
    const [pdfStartPage, setPdfStartPage] = useState<number | string>(1);
    const [pdfEndPage, setPdfEndPage] = useState<number | string>(1);
    const [isExtractingPdf, setIsExtractingPdf] = useState<boolean>(false);
    const [pdfExtractProgress, setPdfExtractProgress] = useState<string>('');
    const pdfFileInputRef = useRef<HTMLInputElement>(null);

    // Summary Editor Modal State (HTML Editörü)
    const [editingItem, setEditingItem] = useState<OzetItem | null>(null);
    const [editText, setEditText] = useState('');
    const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [isBatchGeneratingUnitId, setIsBatchGeneratingUnitId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Fullscreen event listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Load Data
    const loadData = async (showToast = false) => {
        setIsLoading(true);
        try {
            const res = await loadAllOzetlerData();
            if (res.success && res.items) {
                setItems(res.items);
                if (showToast) {
                    toast({ title: "Stüdyo Güncellendi", description: "Tüm kaynak metinler ve özetler başarıyla yüklendi." });
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

    // Available Grades
    const availableGrades = useMemo(() => {
        const grades = new Set<string>();
        items.forEach(i => { if (i.grade) grades.add(i.grade); });
        return Array.from(grades).sort((a, b) => Number(a) - Number(b));
    }, [items]);

    // Ensure selectedGrade is valid
    useEffect(() => {
        if (availableGrades.length === 0) return;
        if (!selectedGrade || !availableGrades.includes(selectedGrade)) {
            const grade5 = availableGrades.find(g => g === '5');
            setSelectedGrade(grade5 || availableGrades[0]);
        }
    }, [availableGrades, selectedGrade]);

    // Available Courses for selectedGrade
    const availableCourses = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        items.forEach(i => {
            if (i.grade !== selectedGrade) return;
            if (!i.courseId) return;
            const existing = map.get(i.courseId);
            if (existing) {
                existing.count++;
            } else {
                map.set(i.courseId, {
                    id: i.courseId,
                    title: i.courseTitle,
                    count: 1
                });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    }, [items, selectedGrade]);

    // Ensure selectedCourseId is valid
    useEffect(() => {
        if (availableCourses.length === 0) {
            setSelectedCourseId('');
            return;
        }
        if (!selectedCourseId || !availableCourses.some(c => c.id === selectedCourseId)) {
            setSelectedCourseId(availableCourses[0].id);
        }
    }, [availableCourses, selectedCourseId]);

    // Reset expanded units whenever course changes (Kapalı başlasın)
    useEffect(() => {
        setExpandedUnitIds([]);
    }, [selectedCourseId]);

    // Group items for current grade & course into units
    const courseUnits = useMemo(() => {
        if (!selectedGrade || !selectedCourseId) return [];

        const unitMap = new Map<string, {
            id: string;
            title: string;
            unitSummary: OzetItem | null;
            topics: OzetItem[];
        }>();

        items.forEach(item => {
            if (item.grade !== selectedGrade || item.courseId !== selectedCourseId || !item.unitId) return;

            if (!unitMap.has(item.unitId)) {
                unitMap.set(item.unitId, {
                    id: item.unitId,
                    title: item.unitTitle || 'Ünite',
                    unitSummary: null,
                    topics: []
                });
            }

            const unitObj = unitMap.get(item.unitId)!;
            if (item.type === 'unit') {
                unitObj.unitSummary = item;
            } else {
                unitObj.topics.push(item);
            }
        });

        const sortedUnits = Array.from(unitMap.values()).sort((a, b) => compareTitles(a.title, b.title));
        sortedUnits.forEach(u => {
            u.topics.sort((a, b) => compareTitles(a.title, b.title));
        });

        return sortedUnits;
    }, [items, selectedGrade, selectedCourseId]);

    // Filtered Units and Topics based on search query and status filter
    const displayedUnits = useMemo(() => {
        const queryClean = searchQuery.trim().toLowerCase();

        return courseUnits.map(unit => {
            // Apply status filter to topics
            let filteredTopics = unit.topics;
            if (filterStatus === 'has_ozet') {
                filteredTopics = filteredTopics.filter(t => t.hasOzet);
            } else if (filterStatus === 'missing_ozet') {
                filteredTopics = filteredTopics.filter(t => !t.hasOzet);
            } else if (filterStatus === 'has_source') {
                filteredTopics = filteredTopics.filter(t => t.sourceText && t.sourceWordCount > 0);
            } else if (filterStatus === 'missing_source') {
                filteredTopics = filteredTopics.filter(t => !t.sourceText || t.sourceWordCount === 0);
            }

            if (!queryClean) {
                return {
                    ...unit,
                    topics: filteredTopics
                };
            }

            const unitMatch = unit.title.toLowerCase().includes(queryClean);
            const matchedTopics = filteredTopics.filter(t => 
                t.title.toLowerCase().includes(queryClean) ||
                (t.sourceText || '').toLowerCase().includes(queryClean)
            );

            if (unitMatch) {
                return {
                    ...unit,
                    topics: filteredTopics
                };
            }

            if (matchedTopics.length > 0) {
                return {
                    ...unit,
                    topics: matchedTopics
                };
            }

            return null;
        }).filter(Boolean) as typeof courseUnits;
    }, [courseUnits, searchQuery, filterStatus]);

    // Parse URL query parameters on initial load
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const gradeParam = params.get('grade');
        if (gradeParam) setSelectedGrade(gradeParam);
        const courseParam = params.get('courseId') || params.get('course');
        if (courseParam) setSelectedCourseId(courseParam);
        const topicParam = params.get('topicId') || params.get('topic');
        if (topicParam && items.length > 0) {
            const found = items.find(i => i.id === topicParam || i.topicId === topicParam);
            if (found) {
                setActiveSelectedItem(found);
            }
        }
    }, [items]);

    // Statistics
    const stats = useMemo(() => {
        const total = items.length;
        const withOzet = items.filter(i => i.hasOzet).length;
        const withoutOzet = total - withOzet;
        const unitItems = items.filter(i => i.type === 'unit');
        const topicItems = items.filter(i => i.type === 'topic');
        const topicWithOzet = topicItems.filter(i => i.hasOzet).length;
        const topicWithSource = topicItems.filter(i => i.sourceWordCount > 0).length;
        return {
            total,
            withOzet,
            withoutOzet,
            unitTotal: unitItems.length,
            topicTotal: topicItems.length,
            topicWithOzet,
            topicWithSource,
        };
    }, [items]);

    // Selected Course Object
    const selectedCourse = useMemo(() => {
        return availableCourses.find(c => c.id === selectedCourseId);
    }, [availableCourses, selectedCourseId]);

    // Toggle Expand All Units
    const handleToggleExpandAll = () => {
        if (expandedUnitIds.length === courseUnits.length) {
            setExpandedUnitIds([]);
        } else {
            setExpandedUnitIds(courseUnits.map(u => u.id));
        }
    };

    // Open Studio Modal for an Item (Topic or Unit Summary)
    const openStudioModal = (item: OzetItem) => {
        setActiveSelectedItem(item);
        setSourceEditText(item.sourceText || '');
        setIsEditingSource(false);
        setActiveTab('preview');
    };

    // Keep source edit text synchronized with active selected item
    useEffect(() => {
        if (activeSelectedItem) {
            setSourceEditText(activeSelectedItem.sourceText || '');
            setIsEditingSource(false);
        }
    }, [activeSelectedItem?.id]);

    // Sequential Navigation inside Active Unit in Modal
    const activeUnitItems = useMemo(() => {
        if (!activeSelectedItem) return [];
        const currentUnit = courseUnits.find(u => u.id === activeSelectedItem.unitId);
        if (!currentUnit) return [];
        const res: OzetItem[] = [];
        if (currentUnit.unitSummary) res.push(currentUnit.unitSummary);
        res.push(...currentUnit.topics);
        return res;
    }, [courseUnits, activeSelectedItem]);

    const activeItemIndex = useMemo(() => {
        return activeUnitItems.findIndex(i => i.id === activeSelectedItem?.id);
    }, [activeUnitItems, activeSelectedItem]);

    const prevItem = activeItemIndex > 0 ? activeUnitItems[activeItemIndex - 1] : null;
    const nextItem = activeItemIndex >= 0 && activeItemIndex < activeUnitItems.length - 1 ? activeUnitItems[activeItemIndex + 1] : null;

    // Copy to Clipboard
    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast({ title: "Kopyalandı", description: "İçerik panoya kopyalandı." });
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast({ title: "Hata", description: "Panoya kopyalanamadı.", variant: "destructive" });
        }
    };

    // Save Source Text Action
    const handleSaveSourceText = async () => {
        if (!activeSelectedItem) return;
        setIsSavingSource(true);
        try {
            const res = await saveItemSourceText(
                activeSelectedItem.courseId,
                activeSelectedItem.unitId,
                activeSelectedItem.topicId,
                sourceEditText
            );

            if (res.success) {
                const trimmed = sourceEditText.trim();
                const updatedItem = {
                    ...activeSelectedItem,
                    sourceText: trimmed,
                    sourceWordCount: res.wordCount
                };
                setActiveSelectedItem(updatedItem);
                setItems(prev => prev.map(i => i.id === activeSelectedItem.id ? updatedItem : i));
                setIsEditingSource(false);
                toast({
                    title: "Kaynak Metin Kaydedildi! 📗",
                    description: `${activeSelectedItem.title} ders kitabı kaynak metni başarıyla güncellendi.`
                });
            } else {
                toast({
                    title: "Kayıt Başarısız",
                    description: res.error || "Kaynak metin kaydedilemedi.",
                    variant: "destructive"
                });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        } finally {
            setIsSavingSource(false);
        }
    };

    // AI Clean & Format Source Text Action
    const handleAiCleanSourceText = async () => {
        const textToClean = isEditingSource ? sourceEditText : (activeSelectedItem?.sourceText || '');
        if (!textToClean.trim()) {
            toast({ title: "Uyarı", description: "İyileştirilecek bir kaynak metin bulunmuyor.", variant: "destructive" });
            return;
        }

        setIsAiCleaningSource(true);
        toast({
            title: "Yapay Zeka Taraması Başladı ✨",
            description: "Ders kitabı metnindeki ayetler, hadisler ve hat düzeni kontrol ediliyor..."
        });

        try {
            const res = await cleanAndFormatSourceTextWithAi(
                textToClean, 
                activeSelectedItem?.title,
                apiKey.trim() || undefined,
                activeModelId
            );
            if (res.success && res.cleanedText) {
                setSourceEditText(res.cleanedText);
                setIsEditingSource(true);
                toast({
                    title: "Metin ve Ayetler İyileştirildi! 🌟",
                    description: "Ayet ve hadis mealleri düzenlendi. Değişiklikleri kaydetmek için 'Kaydet' butonuna basınız."
                });
            } else {
                toast({ title: "Hata", description: res.error || "Metin iyileştirilemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        } finally {
            setIsAiCleaningSource(false);
        }
    };

    // PDF File Load Handler
    const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setPdfExtractProgress('PDF taranıyor...');
            const { pdfDoc: loadedDoc, numPages } = await loadPdf(file);
            setPdfDoc(loadedDoc);
            setPdfFileName(file.name);
            setPdfTotalPages(numPages);
            setPdfStartPage(1);
            setPdfEndPage(Math.min(numPages, 4));
            setPdfExtractProgress('');
            setIsPdfAssistantOpen(true);
            toast({
                title: "PDF Yüklendi 📄",
                description: `${file.name} başarıyla açıldı (${numPages} sayfa).`
            });
        } catch (err: any) {
            console.error("PDF load error:", err);
            toast({
                title: "PDF Açılamadı",
                description: err.message || "PDF dosyası işlenirken hata oluştu.",
                variant: "destructive"
            });
        }
    };

    // Extract Text from PDF Page Range Handler
    const handleExtractFromPdf = async () => {
        if (!pdfDoc) return;
        const start = Number(pdfStartPage);
        const end = Number(pdfEndPage);

        if (!start || !end || start < 1 || end > pdfTotalPages || start > end) {
            toast({
                title: "Geçersiz Sayfa Aralığı",
                description: `Lütfen 1 ile ${pdfTotalPages} arasında geçerli bir sayfa aralığı girin.`,
                variant: "destructive"
            });
            return;
        }

        setIsExtractingPdf(true);
        setPdfExtractProgress(`${start}. - ${end}. sayfalar arası metinler çıkarılıyor...`);

        try {
            const result = await extractTextFromPageRange(pdfDoc, start, end, (current, total) => {
                setPdfExtractProgress(`Sayfa ${current}/${total} işleniyor...`);
            });

            if (result && result.fullText) {
                setSourceEditText(result.fullText);
                setIsEditingSource(true);
                setIsPdfAssistantOpen(false);
                toast({
                    title: "Metin Aktarıldı! 🎉",
                    description: `${result.pages.length} sayfadan toplam ${result.totalWords} kelime başarıyla aktarıldı.`
                });
            } else {
                toast({
                    title: "Metin Bulunamadı",
                    description: "Seçilen sayfalardan okunabilir metin çıkarılamadı.",
                    variant: "destructive"
                });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message || "Metin çıkarılırken hata oluştu.", variant: "destructive" });
        } finally {
            setIsExtractingPdf(false);
            setPdfExtractProgress('');
        }
    };

    // Open Summary Editor Dialog
    const handleOpenEdit = (item: OzetItem) => {
        setEditingItem(item);
        setEditText(item.htmlContent || '');
        setEditorTab('edit');
    };

    // Save Summary Action
    const handleSaveEdit = async () => {
        if (!editingItem) return;
        setIsSaving(true);
        try {
            const res = await saveOzetContent(
                editingItem.courseId,
                editingItem.unitId,
                editingItem.topicId,
                editText
            );

            if (res.success) {
                const trimmed = editText.trim();
                const updated = {
                    ...editingItem,
                    htmlContent: trimmed,
                    wordCount: res.wordCount,
                    charCount: trimmed.length,
                    hasOzet: trimmed.length > 0
                };
                setItems(prev => prev.map(i => i.id === editingItem.id ? updated : i));
                if (activeSelectedItem?.id === editingItem.id) {
                    setActiveSelectedItem(updated);
                }

                toast({ 
                    title: "Özet Kaydedildi! 🎉", 
                    description: `${editingItem.title} özeti hem yerel dosyalara hem de veritabanına kaydedildi.` 
                });
                setEditingItem(null);
            } else {
                toast({ title: "Kayıt Hatası", description: res.error || "Özet kaydedilemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message || "İşlem sırasında hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // Clear Summary Action
    const handleClearOzet = async (item: OzetItem) => {
        try {
            const res = await clearOzetContent(item.courseId, item.unitId, item.topicId);
            if (res.success) {
                const updated = {
                    ...item,
                    htmlContent: '',
                    wordCount: 0,
                    charCount: 0,
                    hasOzet: false
                };
                setItems(prev => prev.map(i => i.id === item.id ? updated : i));
                if (activeSelectedItem?.id === item.id) {
                    setActiveSelectedItem(updated);
                }
                toast({ title: "Temizlendi", description: `${item.title} özeti başarıyla sıfırlandı.` });
            } else {
                toast({ title: "Hata", description: res.error || "Özet silinemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        }
    };

    // AI Generate Summary Action (Strictly from Source Text)
    const handleAiGenerate = async (item: OzetItem) => {
        setIsGeneratingAi(true);
        try {
            toast({ 
                title: "Ders Kitabı Kaynak Metni İnceleniyor... ✨", 
                description: `${item.title} için kaynak metin taranarak pedagojik ve interaktif HTML özet hazırlanıyor...` 
            });

            const unitTopics = items.filter(i => i.unitId === item.unitId && i.type === 'topic').map(t => t.title);

            const res = await generateOzetWithAi({
                title: item.title,
                type: item.type,
                sourceText: item.sourceText,
                grade: item.grade,
                courseTitle: item.courseTitle,
                unitTitle: item.unitTitle,
                topicTitles: unitTopics,
                apiKey: apiKey.trim() || undefined,
                modelName: activeModelId
            });

            if (res.success && res.htmlContent) {
                setEditingItem(item);
                setEditText(res.htmlContent);
                setEditorTab('preview');
                toast({ 
                    title: "Özet Başarıyla Üretildi! 🌟", 
                    description: "Üretilen özeti önizleyin ve kaydetmek için 'Değişiklikleri Kaydet' butonuna basın." 
                });
            } else {
                toast({ title: "Üretim Başarısız", description: res.error || "Yapay zeka yanıt vermedi.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: err.message, variant: "destructive" });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Batch Generate Summaries for All Topics in Unit
    const handleBatchGenerateUnitTopics = async (unitId: string, unitTitle: string) => {
        if (!selectedCourseId) return;
        setIsBatchGeneratingUnitId(unitId);
        try {
            toast({
                title: "Toplu Özet Üretimi Başlatıldı ⚡",
                description: `${unitTitle} ünitesindeki kaynak metni hazır konular taranıyor ve yapay zeka ile özetler oluşturuluyor...`
            });

            const res = await batchGenerateUnitTopicSummaries(
                selectedCourseId, 
                unitId,
                apiKey.trim() || undefined,
                activeModelId
            );

            if (res.success) {
                toast({
                    title: "Toplu Üretim Tamamlandı! 🎉",
                    description: `${res.generatedCount} konunun özeti kaynak metinlerden başarıyla üretildi ve kütüphaneye kaydedildi.`
                });
                await loadData(false);
            } else {
                toast({
                    title: "Toplu Üretim Uyarısı",
                    description: res.errors?.join('; ') || "Kaynak metin bulunamadı veya üretim yapılamadı.",
                    variant: "destructive"
                });
            }
        } catch (err: any) {
            console.error("Batch generate error:", err);
            toast({
                title: "Hata",
                description: err.message || "Toplu üretim sırasında bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsBatchGeneratingUnitId(null);
        }
    };

    // Quick Template Inserter in Editor
    const insertTemplate = (templateType: 'heading' | 'callout' | 'ayah' | 'hadith' | 'concept' | 'points') => {
        let snippet = '';
        switch (templateType) {
            case 'heading':
                snippet = '\n<div class="my-6 border-b border-indigo-200 pb-2">\n  <h2 class="text-2xl font-black text-indigo-900">📌 Yeni Başlık</h2>\n</div>\n';
                break;
            case 'callout':
                snippet = '\n<div class="my-4 p-5 rounded-2xl bg-amber-50 border-l-4 border-amber-500 shadow-sm">\n  <h4 class="font-bold text-amber-900 mb-1">💡 Dikkat Edelim!</h4>\n  <p class="text-amber-800 text-sm">Buraya önemli not veya sınav ipucu metnini girin.</p>\n</div>\n';
                break;
            case 'ayah':
                snippet = '\n<div class="my-4 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">\n  <p class="text-xl font-arabic text-emerald-950 text-right leading-relaxed mb-2" dir="rtl">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّح۪يمِ</p>\n  <p class="text-sm font-semibold text-emerald-800 italic">"Rahman ve Rahim olan Allah\'ın adıyla."</p>\n  <span class="block text-xs text-emerald-600 mt-1 font-bold">Kaynak / Sure Adı</span>\n</div>\n';
                break;
            case 'hadith':
                snippet = '\n<div class="my-4 p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm">\n  <h4 class="font-bold text-rose-900 mb-2 flex items-center gap-2">💬 Peygamber Efendimiz (s.a.v.) Buyurdu ki:</h4>\n  <p class="text-rose-950 font-medium italic">"Buraya hadis metnini giriniz."</p>\n  <span class="block text-xs text-rose-600 mt-1 font-bold">(Hadis Kaynağı)</span>\n</div>\n';
                break;
            case 'concept':
                snippet = '\n<div class="my-4 p-4 rounded-xl bg-indigo-50/80 border border-indigo-200">\n  <span class="font-black text-indigo-900 uppercase tracking-wider text-xs">Kavram:</span>\n  <h4 class="font-bold text-lg text-indigo-950">Kavram Adı</h4>\n  <p class="text-slate-700 text-sm mt-1">Kavramın MEB ders kitabı tanımı buraya yazılır.</p>\n</div>\n';
                break;
            case 'points':
                snippet = '\n<ul class="my-4 space-y-2">\n  <li class="flex items-start gap-2 text-slate-800"><span class="text-emerald-500 font-bold">✔</span> Birinci önemli kazanım ve madde.</li>\n  <li class="flex items-start gap-2 text-slate-800"><span class="text-emerald-500 font-bold">✔</span> İkinci önemli kazanım ve madde.</li>\n  <li class="flex items-start gap-2 text-slate-800"><span class="text-emerald-500 font-bold">✔</span> Üçüncü önemli kazanım ve madde.</li>\n</ul>\n';
                break;
        }
        setEditText(prev => prev + snippet);
    };

    // Fullscreen Smartboard URL for active item
    const smartboardUrl = useMemo(() => {
        if (!activeSelectedItem) return '#';
        if (activeSelectedItem.type === 'unit') {
            return `/teacher/smartboard/ozetler/goruntule/${activeSelectedItem.courseId}/${activeSelectedItem.unitId}`;
        }
        return `/teacher/smartboard/ozetler/goruntule/${activeSelectedItem.courseId}/${activeSelectedItem.unitId}/${activeSelectedItem.targetId}`;
    }, [activeSelectedItem]);

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-3 sm:p-5 md:p-8 relative overflow-x-hidden">
            {/* Kozmik Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[750px] h-[750px] bg-purple-900/10 rounded-full blur-[160px]" />
                <div className="absolute top-[20%] right-[-10%] w-[650px] h-[650px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[160px]" />
            </div>

            {/* Gizli PDF Dosya Girişi */}
            <input 
                type="file" 
                ref={pdfFileInputRef} 
                accept=".pdf" 
                onChange={handlePdfFileSelect} 
                className="hidden" 
            />

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">

                {/* ══ ÜST BAŞLIK & HIZLI İŞLEM BUTONLARI ══ */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-white/8 pb-5">
                    <div className="flex items-center gap-3.5">
                        <Link
                            href="/teacher"
                            className="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-all shadow-md group"
                            title="Öğretmen Paneline Dön"
                        >
                            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
                                    Ders Kitabı & Özet Stüdyosu
                                </h1>
                                <Badge variant="outline" className="bg-purple-950/60 border-purple-500/30 text-purple-300 text-[11px] font-bold px-2 py-0.5">
                                    Müfredat & Özetler
                                </Badge>
                            </div>
                            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                                MEB ders kitabı kaynak metinlerini girin, PDF'ten aktarın ve akıllı tahta için interaktif özetler hazırlayın.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
                        {/* AI Model & API Ayarları Tetikleyici */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowModelSettings(prev => !prev)}
                            className={cn(
                                "h-9 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                showModelSettings
                                    ? "bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                                    : "border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-950/40 bg-slate-900/60"
                            )}
                        >
                            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
                            <span className="hidden sm:inline">AI Model:</span>
                            <span className="font-mono text-white bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-500/30 text-[11px]">
                                {FREE_GEMINI_MODELS.find(m => m.id === activeModelId)?.name || activeModelId}
                            </span>
                            {showModelSettings ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                        </Button>

                        <Button 
                            asChild
                            variant="outline"
                            className="border-rose-500/30 text-rose-300 hover:text-white hover:bg-rose-950/40 bg-slate-900/60 h-9 rounded-xl text-xs font-bold"
                        >
                            <Link href="/teacher/smartboard">
                                <MonitorPlay className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
                                Akıllı Tahta Menüsü
                            </Link>
                        </Button>

                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setIsRefreshing(true); loadData(true); }}
                            disabled={isRefreshing || isLoading}
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10 bg-slate-900/60 h-9 rounded-xl text-xs font-bold"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefreshing && "animate-spin text-purple-400")} />
                            Yenile
                        </Button>
                    </div>
                </div>

                {/* ══ AI MODEL & API KEY AYAR PANELİ (AÇILIR/KAPANIR) ══ */}
                {showModelSettings && (
                    <div className="rounded-2xl border border-purple-500/40 bg-slate-900/95 backdrop-blur-2xl p-4 shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    <Settings2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        Yapay Zeka API & Model Yapılandırması
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Özet üretimi ve ders kitabı metin analizi için kullanılacak Gemini modelini ve API anahtarınızı belirleyin.
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowModelSettings(false)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            {/* API Key Girişi */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                                        <Key className="w-3.5 h-3.5 text-amber-400" />
                                        Gemini API Key (İsteğe Bağlı)
                                    </Label>
                                    <a
                                        href="https://aistudio.google.com/app/apikey"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                                    >
                                        Ücretsiz Key Al <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                </div>
                                <div className="relative">
                                    <Input
                                        type={showApiKeyText ? "text" : "password"}
                                        value={apiKey}
                                        onChange={(e) => handleUpdateApiKey(e.target.value)}
                                        placeholder="AIzaSy... (Boşsa sistemdeki anahtar kullanılır)"
                                        className="bg-slate-950 border-white/10 text-xs text-white placeholder:text-slate-600 pr-8 h-9 rounded-xl"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKeyText(!showApiKeyText)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                                    >
                                        {showApiKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Model Seçimi */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-300 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                        Aktif Model
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={() => setIsCustomModel(!isCustomModel)}
                                        className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                                    >
                                        {isCustomModel ? "Listeden Seç" : "Özel Model Yaz"}
                                    </button>
                                </div>

                                {isCustomModel ? (
                                    <Input
                                        value={customModelInput}
                                        onChange={(e) => {
                                            setCustomModelInput(e.target.value);
                                            if (typeof window !== 'undefined') {
                                                localStorage.setItem('custom_gemini_model', e.target.value);
                                            }
                                        }}
                                        placeholder="Örn: gemini-2.5-pro, gemini-1.5-pro"
                                        className="bg-slate-950 border-white/10 text-xs text-white placeholder:text-slate-600 h-9 rounded-xl"
                                    />
                                ) : (
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => handleUpdateModel(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl text-xs text-white px-3 h-9 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                                    >
                                        {FREE_GEMINI_MODELS.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.name} — {m.tag}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>

                        {/* Model Hızlı Seçim Hapları */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                            {FREE_GEMINI_MODELS.map(m => (
                                <div 
                                    key={m.id} 
                                    onClick={() => handleUpdateModel(m.id)}
                                    className={cn(
                                        "p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                                        selectedModel === m.id && !isCustomModel
                                            ? "bg-purple-950/60 border-purple-500 shadow-md ring-1 ring-purple-500/50" 
                                            : "bg-slate-950/60 border-white/5 hover:border-white/15"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-bold text-white">{m.name}</span>
                                        <Badge variant="outline" className={cn("text-[8px] px-1 py-0", m.badge)}>{m.tag.split(' ')[0]}</Badge>
                                    </div>
                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{m.desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs flex-wrap gap-2">
                            <span className="text-slate-400 text-[11px]">
                                Tarayıcıda saklanan ayarlar tüm özet üretimlerinde ve kaynak metin iyileştirmelerinde kullanılır.
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleSaveAiConfigGlobally}
                                disabled={isSavingSystemKey || !apiKey.trim()}
                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold border-none h-8 px-3 rounded-xl shadow-md cursor-pointer"
                            >
                                {isSavingSystemKey ? (
                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Kaydediliyor...</>
                                ) : isKeySaved ? (
                                    <><Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" /> Sisteme Kaydedildi!</>
                                ) : (
                                    <><Save className="w-3.5 h-3.5 mr-1.5" /> Sisteme Kalıcı Kaydet</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ══ SEÇİM KOKPİTİ: SINIF VE DERS SEÇİCİ (İÇERİK YÖNETİMİ BİREBİR TASARIMI) ══ */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl p-4 shadow-2xl space-y-3.5">
                    {/* 1. SATIR: SINIF SEÇİMİ */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black tracking-wider uppercase text-slate-400 px-1 flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4 text-cyan-400" /> Sınıf:
                            </span>
                            <div className="flex items-center gap-2 flex-wrap bg-black/40 p-1.5 rounded-xl border border-white/10">
                                {availableGrades.map((grade) => {
                                    const isSelected = grade === selectedGrade;
                                    const theme = classBadgeThemes[grade] || defaultClassTheme;

                                    return (
                                        <button
                                            key={grade}
                                            onClick={() => setSelectedGrade(grade)}
                                            className={cn(
                                                "h-9 px-4 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer",
                                                isSelected ? theme.active : theme.idle
                                            )}
                                        >
                                            <span>{grade}. Sınıf</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Hızlı Özet İstatistiği */}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="bg-slate-950/60 px-3 py-1.5 rounded-xl border border-white/8 font-medium">
                                <strong className="text-emerald-400 font-bold">{stats.topicWithOzet}</strong>/{stats.topicTotal} Konu Özeti Hazır
                            </span>
                        </div>
                    </div>

                    {/* 2. SATIR: DERS SEÇİMİ (SEÇİLİ SINIFIN DERSLERİ) */}
                    {availableCourses.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pt-2.5 border-t border-white/8">
                            <span className="text-xs font-black tracking-wider uppercase text-slate-400 px-1 flex-shrink-0 flex items-center gap-1.5">
                                <BookIcon className="w-4 h-4 text-purple-400" /> Ders:
                            </span>
                            <div className="flex items-center gap-2 overflow-x-auto py-0.5 flex-1">
                                {availableCourses.map((course, idx) => {
                                    const isSelected = course.id === selectedCourseId;
                                    const theme = courseGradients[idx % courseGradients.length];

                                    return (
                                        <button
                                            key={course.id}
                                            onClick={() => setSelectedCourseId(course.id)}
                                            className={cn(
                                                "h-8 px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 cursor-pointer flex-shrink-0",
                                                isSelected ? theme.active : theme.idle
                                            )}
                                        >
                                            <span>{course.title}</span>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* ══ MÜFREDAT AKORDİYON ALANI: ÜNİTELER VE KONULAR ══ */}
                <div className="space-y-4">
                    {/* Arama & Hızlı Araç Çubuğu */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ünite veya konularda ara..."
                                className="pl-10 h-10 bg-slate-900/60 border-white/10 text-xs text-white rounded-xl placeholder:text-slate-500 focus:border-purple-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Durum Filtre Hapları */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                    filterStatus === 'all'
                                        ? "bg-purple-600 text-white border-purple-400"
                                        : "bg-slate-900/60 text-slate-400 border-white/10 hover:text-white"
                                )}
                            >
                                Tümü
                            </button>
                            <button
                                onClick={() => setFilterStatus('has_ozet')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                    filterStatus === 'has_ozet'
                                        ? "bg-emerald-600 text-white border-emerald-400"
                                        : "bg-slate-900/60 text-emerald-400/80 border-emerald-500/20 hover:text-emerald-300"
                                )}
                            >
                                Özeti Olanlar
                            </button>
                            <button
                                onClick={() => setFilterStatus('missing_ozet')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                    filterStatus === 'missing_ozet'
                                        ? "bg-amber-600 text-white border-amber-400"
                                        : "bg-slate-900/60 text-amber-400/80 border-amber-500/20 hover:text-amber-300"
                                )}
                            >
                                Özeti Eksikler
                            </button>
                            <button
                                onClick={() => setFilterStatus('has_source')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                    filterStatus === 'has_source'
                                        ? "bg-teal-600 text-white border-teal-400"
                                        : "bg-slate-900/60 text-teal-400/80 border-teal-500/20 hover:text-teal-300"
                                )}
                            >
                                Kaynak Metin Hazır
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {courseUnits.length > 0 && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleToggleExpandAll}
                                    className="text-xs text-slate-400 hover:text-white hover:bg-white/5 h-9 rounded-xl cursor-pointer"
                                >
                                    {expandedUnitIds.length === courseUnits.length ? 'Tümünü Kapat' : 'Tümünü Aç'}
                                </Button>
                            )}
                            
                            <span className="text-xs font-bold text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-white/8 whitespace-nowrap">
                                Toplam {courseUnits.length} Ünite • {courseUnits.reduce((acc, u) => acc + u.topics.length, 0)} Konu
                            </span>
                        </div>
                    </div>

                    {/* Yükleme Durumu */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-white/10 bg-slate-900/40">
                            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
                            <p className="text-sm text-slate-400 font-medium">Müfredat ve özet stüdyosu yükleniyor...</p>
                        </div>
                    ) : !selectedCourse ? (
                        /* Ders Bulunamadı Durumu */
                        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 p-6">
                            <FolderPlus className="h-16 w-16 mx-auto mb-4 text-slate-600 opacity-50" />
                            <p className="text-lg font-bold text-white mb-1">Bu sınıfta henüz ders bulunmuyor.</p>
                            <p className="text-xs text-slate-400">İçerik yönetiminden ders ve üniteleri ekleyebilirsiniz.</p>
                        </div>
                    ) : displayedUnits.length === 0 ? (
                        /* Ünite Bulunamadı Durumu */
                        <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 p-6">
                            <Library className="h-16 w-16 mx-auto mb-4 text-slate-600 opacity-50" />
                            <p className="text-lg font-bold text-white mb-1">
                                {searchQuery ? 'Aramanızla eşleşen ünite veya konu bulunamadı.' : 'Bu derste henüz ünite bulunmuyor.'}
                            </p>
                            <p className="text-xs text-slate-400">Filtreleri temizleyebilir veya içerik yönetiminden müfredatı düzenleyebilirsiniz.</p>
                        </div>
                    ) : (
                        /* Üniteler ve Konular Akordiyonu (VARSAYILAN KAPALI) */
                        <Accordion
                            type="multiple"
                            value={expandedUnitIds}
                            onValueChange={setExpandedUnitIds}
                            className="space-y-4"
                        >
                            {displayedUnits.map((unit) => {
                                const unitTopicsWithSource = unit.topics.filter(t => t.sourceText && t.sourceWordCount > 0);
                                const unitTopicsWithOzet = unit.topics.filter(t => t.hasOzet);
                                const hasUnitOzet = !!unit.unitSummary?.hasOzet;
                                const isBatchGeneratingThis = isBatchGeneratingUnitId === unit.id;

                                return (
                                    <AccordionItem
                                        key={unit.id}
                                        value={unit.id}
                                        className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl overflow-hidden shadow-xl transition-all duration-300"
                                    >
                                        {/* ── ÜNİTE BAŞLIK ÇUBUĞU ── */}
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 px-4 sm:px-5 py-3.5 bg-slate-900/90 border-b border-white/5">
                                            {/* Sol: Akordiyon Açma Tetikleyicisi & Ünite Adı */}
                                            <AccordionTrigger className="flex-1 py-1 hover:no-underline text-left cursor-pointer [&[data-state=open]>div>svg]:rotate-180">
                                                <div className="flex items-center gap-3 w-full pr-3">
                                                    <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex-shrink-0">
                                                        <BookOpen className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-base sm:text-lg font-black text-white truncate">
                                                                {unit.title}
                                                            </span>
                                                            <Badge variant="outline" className="bg-black/30 text-purple-300 border-purple-500/25 text-[10px] px-2 py-0">
                                                                {unit.topics.length} Konu
                                                            </Badge>
                                                            <Badge variant="outline" className={cn(
                                                                "text-[10px] px-2 py-0",
                                                                unitTopicsWithOzet.length === unit.topics.length && unit.topics.length > 0
                                                                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/30"
                                                                    : "bg-amber-950/60 text-amber-300 border-amber-500/30"
                                                            )}>
                                                                {unitTopicsWithOzet.length}/{unit.topics.length} Özet Hazır
                                                            </Badge>
                                                            <Badge variant="outline" className="bg-teal-950/50 text-teal-300 border-teal-500/25 text-[10px] px-2 py-0">
                                                                {unitTopicsWithSource.length}/{unit.topics.length} Kaynak Metin
                                                            </Badge>
                                                            {hasUnitOzet && (
                                                                <Badge variant="outline" className="bg-rose-950/60 text-rose-300 border-rose-500/30 text-[10px] px-2 py-0">
                                                                    ⭐ Ünite Özeti Hazır
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>

                                            {/* Sağ: Ünite İşlem Butonları (StopPropagation ile akordiyonu tetiklemez) */}
                                            <div
                                                className="flex items-center gap-2 flex-wrap flex-shrink-0 self-end lg:self-center"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Varsa Ünite Özeti Stüdyosu */}
                                                {unit.unitSummary && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openStudioModal(unit.unitSummary!)}
                                                        className="border-purple-500/40 text-purple-300 hover:bg-purple-900/50 hover:text-white bg-purple-950/40 text-xs font-bold h-8 px-3 rounded-xl cursor-pointer"
                                                        title="Ünite Genel Özetini ve Kaynak Metinlerini Aç"
                                                    >
                                                        <Layers className="h-3.5 w-3.5 mr-1 text-purple-400" />
                                                        Ünite Özeti Stüdyosu
                                                    </Button>
                                                )}

                                                {/* Toplu AI Özetle Butonu */}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isBatchGeneratingThis || unitTopicsWithSource.length === 0}
                                                    onClick={() => handleBatchGenerateUnitTopics(unit.id, unit.title)}
                                                    className="border-amber-500/40 text-amber-300 hover:bg-amber-950/60 hover:text-white bg-slate-900 text-xs font-bold h-8 px-3 rounded-xl cursor-pointer"
                                                    title="Kaynak metni hazır tüm konuların özetlerini yapay zeka ile otomatik üretir"
                                                >
                                                    <Zap className={cn("h-3.5 w-3.5 mr-1 text-amber-400", isBatchGeneratingThis && "animate-spin")} />
                                                    {isBatchGeneratingThis ? "Toplu Üretiliyor..." : "Toplu AI Özetle"}
                                                </Button>

                                                {/* Varsa Ünite Özeti Akıllı Tahta Linki */}
                                                {hasUnitOzet && (
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        asChild
                                                        className="h-8 w-8 text-rose-300 hover:text-white hover:bg-rose-950/40 rounded-xl cursor-pointer"
                                                        title="Ünite Özetini Akıllı Tahtada Aç"
                                                    >
                                                        <Link href={`/teacher/smartboard/ozetler/goruntule/${selectedCourseId}/${unit.id}`} target="_blank">
                                                            <MonitorPlay className="h-3.5 w-3.5 text-rose-400" />
                                                        </Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── ÜNİTE İÇERİĞİ: KONU KARTLARI IZGARASI ── */}
                                        <AccordionContent className="p-4 sm:p-5 bg-black/30 border-t border-white/5">
                                            {unit.topics.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                                    {unit.topics.map((topic, topicIdx) => {
                                                        const hasSource = topic.sourceText && topic.sourceWordCount > 0;
                                                        const smartboardTopicUrl = `/teacher/smartboard/ozetler/goruntule/${selectedCourseId}/${unit.id}/${topic.targetId}`;

                                                        return (
                                                            <div
                                                                key={topic.id}
                                                                className={cn(
                                                                    "group relative rounded-2xl border transition-all duration-300 p-4 flex flex-col justify-between shadow-lg hover:-translate-y-0.5",
                                                                    topic.hasOzet
                                                                        ? "bg-slate-900/70 hover:bg-slate-900 border-white/10 hover:border-purple-500/50 hover:shadow-purple-500/10"
                                                                        : "bg-slate-950/50 hover:bg-slate-900/60 border-dashed border-amber-500/30"
                                                                )}
                                                            >
                                                                {/* Kart Üst Bilgisi */}
                                                                <div>
                                                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                                                        <span className="text-[10px] font-black tracking-wider uppercase text-slate-500">
                                                                            {topicIdx + 1}. Konu
                                                                        </span>
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            {topic.hasOzet ? (
                                                                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono">
                                                                                    {topic.wordCount} k. Özet
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                                                                    Özet Yok
                                                                                </span>
                                                                            )}

                                                                            {hasSource ? (
                                                                                <span className="text-[10px] font-bold text-teal-300 bg-teal-950/60 border border-teal-500/30 px-1.5 py-0.5 rounded-md font-mono" title="Kaynak Metin">
                                                                                    {topic.sourceWordCount} k.
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>

                                                                    {/* Konu Başlığı */}
                                                                    <button
                                                                        onClick={() => openStudioModal(topic)}
                                                                        className="text-left block group/link w-full cursor-pointer"
                                                                    >
                                                                        <h3 className="text-sm sm:text-base font-bold text-white group-hover/link:text-purple-300 transition-colors line-clamp-2 min-h-[44px]">
                                                                            {topic.title}
                                                                        </h3>
                                                                    </button>
                                                                </div>

                                                                {/* Kart Alt Çubuğu & Aksiyonlar */}
                                                                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                                                    {/* Birincil Aksiyon: Stüdyoyu Aç */}
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => openStudioModal(topic)}
                                                                        className="bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 hover:border-purple-500 text-white font-bold text-xs h-8 px-3 rounded-xl flex-1 transition-all cursor-pointer"
                                                                    >
                                                                        <Sparkles className="h-3 w-3 mr-1 text-yellow-300" />
                                                                        Stüdyoyu Aç
                                                                    </Button>

                                                                    {/* Akıllı Tahtada Aç Butonu */}
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        asChild
                                                                        className="h-8 w-8 text-rose-300 hover:text-white hover:bg-rose-950/40 rounded-xl cursor-pointer"
                                                                        title="Akıllı Tahtada Aç"
                                                                    >
                                                                        <Link href={smartboardTopicUrl} target="_blank">
                                                                            <MonitorPlay className="h-3.5 w-3.5 text-rose-400" />
                                                                        </Link>
                                                                    </Button>

                                                                    {/* Hızlı AI ile Üret */}
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => handleAiGenerate(topic)}
                                                                        disabled={isGeneratingAi}
                                                                        className="h-8 w-8 text-slate-400 hover:text-yellow-300 hover:bg-yellow-950/30 rounded-xl cursor-pointer"
                                                                        title="Kaynak Metinden AI ile Özet Üret"
                                                                    >
                                                                        <Wand2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 text-slate-500 text-xs">
                                                    Bu ünitede listelenecek konu bulunmuyor.
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </div>
            </div>

            {/* ══ STÜDYO ÇALIŞMA MASASI MODALI (TAM DONANIMLI ÇALIŞMA ALANI) ══ */}
            <Dialog open={!!activeSelectedItem} onOpenChange={(open) => !open && setActiveSelectedItem(null)}>
                <DialogContent className="max-w-7xl w-[96vw] h-[92vh] flex flex-col bg-slate-900 border-white/10 text-slate-100 rounded-3xl p-0 overflow-hidden shadow-2xl">
                    {/* Stüdyo Başlık Çubuğu */}
                    <DialogHeader className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium flex-wrap">
                                <span className="text-purple-400 font-bold">{selectedGrade}. Sınıf</span>
                                <span>›</span>
                                <span className="truncate max-w-[140px]">{selectedCourse?.title}</span>
                                <span>›</span>
                                <span className="truncate max-w-[160px] text-slate-300">{activeSelectedItem?.unitTitle}</span>
                                <Badge className={cn(
                                    "text-[10px] font-black uppercase px-2 py-0.5 ml-1",
                                    activeSelectedItem?.type === 'unit'
                                        ? "bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-sm"
                                        : "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                                )}>
                                    {activeSelectedItem?.type === 'unit' ? '⭐ ÜNİTE ÖZETİ' : 'KONU ÖZETİ'}
                                </Badge>
                            </div>
                            <DialogTitle className="text-lg sm:text-xl font-black text-white truncate flex items-center gap-2">
                                {activeSelectedItem?.title}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                {activeSelectedItem?.title} konusu ders kitabı ve özet stüdyosu
                            </DialogDescription>
                        </div>

                        {/* Önceki & Sonraki Butonları ve Akıllı Tahtada Başlat */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!prevItem}
                                onClick={() => prevItem && openStudioModal(prevItem)}
                                className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-8 px-2.5 text-xs cursor-pointer"
                                title={prevItem ? `Önceki: ${prevItem.title}` : 'Önceki konu yok'}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!nextItem}
                                onClick={() => nextItem && openStudioModal(nextItem)}
                                className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-8 px-2.5 text-xs cursor-pointer"
                                title={nextItem ? `Sonraki: ${nextItem.title}` : 'Sonraki konu yok'}
                            >
                                Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>

                            {activeSelectedItem && (
                                <Button
                                    asChild
                                    size="sm"
                                    className="bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold rounded-xl h-8 px-3.5 text-xs shadow-md shadow-rose-950/40 cursor-pointer"
                                >
                                    <a href={smartboardUrl} target="_blank" rel="noopener noreferrer">
                                        <MonitorPlay className="w-3.5 h-3.5 mr-1.5" />
                                        Tahtada Sun
                                    </a>
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    {/* Stüdyo 4 Temel Çalışma Sekmesi */}
                    <div className="px-4 py-2 bg-slate-950/50 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-white/10 flex-wrap">
                            <button
                                onClick={() => setActiveTab('source')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'source' ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40" : "text-emerald-400 hover:text-white"
                                )}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>1. Kaynak Metin (Ders Kitabı)</span>
                                {activeSelectedItem?.sourceWordCount ? (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/20 rounded">
                                        {activeSelectedItem.sourceWordCount} k.
                                    </span>
                                ) : null}
                            </button>

                            <button
                                onClick={() => setActiveTab('preview')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'preview' ? "bg-purple-600 text-white shadow-md shadow-purple-950/40" : "text-purple-300 hover:text-white"
                                )}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>2. Akıllı Tahta Özeti</span>
                                {activeSelectedItem?.hasOzet ? (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/20 rounded">
                                        {activeSelectedItem.wordCount} k.
                                    </span>
                                ) : null}
                            </button>

                            <button
                                onClick={() => setActiveTab('split')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'split' ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40" : "text-indigo-300 hover:text-white"
                                )}
                            >
                                <Columns className="w-3.5 h-3.5" />
                                <span>3. Yan Yana Stüdyo</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('code')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'code' ? "bg-slate-700 text-white shadow-md" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <Code2 className="w-3.5 h-3.5" />
                                <span>HTML Kodu</span>
                            </button>
                        </div>
                    </div>

                    {/* Stüdyo Çalışma Masası Gövdesi */}
                    <div ref={readerContainerRef} className="flex-1 overflow-hidden relative flex flex-col bg-slate-950/60">
                        {/* ── SEKME 1: DERS KİTABI KAYNAK METNİ ── */}
                        {activeTab === 'source' && (
                            <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-slate-950/80">
                                <div className="px-4 py-2.5 bg-slate-950/90 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-bold">
                                            <BookOpen className="w-4 h-4" />
                                            <span>
                                                {isEditingSource 
                                                    ? `${sourceEditText.trim().split(/\s+/).filter(Boolean).length} kelime (${sourceEditText.length} karakter)`
                                                    : `${activeSelectedItem?.sourceWordCount || 0} kelime`
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => pdfFileInputRef.current?.click()}
                                            className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 hover:text-white rounded-xl text-xs h-8 cursor-pointer"
                                            title="MEB Ders Kitabı PDF'inden sayfa aralığı seçerek metin aktarın"
                                        >
                                            <FileUp className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                                            PDF'ten Metin Aktar
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={isAiCleaningSource}
                                            onClick={handleAiCleanSourceText}
                                            className="border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50 hover:text-white rounded-xl text-xs h-8 cursor-pointer"
                                            title="PDF tarama hatalarını temizler, ayet ve hadisleri düzgün Arapça hatta ve Türkçe meale dönüştürür"
                                        >
                                            <Sparkles className={cn("w-3.5 h-3.5 mr-1", isAiCleaningSource && "animate-spin text-purple-400")} />
                                            {isAiCleaningSource ? "İyileştiriliyor..." : "AI ile Ayetleri Düzenle"}
                                        </Button>

                                        {!isEditingSource ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setIsEditingSource(true)}
                                                className="border-white/10 text-slate-300 hover:text-white bg-slate-900 rounded-xl text-xs h-8 cursor-pointer"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 mr-1 text-blue-400" />
                                                Metni Düzenle
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSourceEditText(activeSelectedItem?.sourceText || '');
                                                        setIsEditingSource(false);
                                                    }}
                                                    className="text-slate-400 hover:text-white rounded-xl text-xs h-8 cursor-pointer"
                                                >
                                                    Vazgeç
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    disabled={isSavingSource}
                                                    onClick={handleSaveSourceText}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs h-8 px-3 shadow-md cursor-pointer"
                                                >
                                                    <Save className={cn("w-3.5 h-3.5 mr-1", isSavingSource && "animate-spin")} />
                                                    {isSavingSource ? "Kaydediliyor..." : "Kaydet"}
                                                </Button>
                                            </>
                                        )}

                                        <Button
                                            size="sm"
                                            disabled={isGeneratingAi || (!isEditingSource && !activeSelectedItem?.sourceText)}
                                            onClick={() => {
                                                if (activeSelectedItem) {
                                                    setActiveTab('preview');
                                                    handleAiGenerate(activeSelectedItem);
                                                }
                                            }}
                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs h-8 px-3 shadow-md cursor-pointer"
                                        >
                                            <Sparkles className="w-3.5 h-3.5 mr-1" />
                                            Bu Metinden Özet Üret
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={!sourceEditText && !activeSelectedItem?.sourceText}
                                            onClick={() => {
                                                const txt = isEditingSource ? sourceEditText : (activeSelectedItem?.sourceText || '');
                                                navigator.clipboard.writeText(txt);
                                                setCopiedSource(true);
                                                toast({ title: "Kopyalandı", description: "Kaynak metin panoya kopyalandı." });
                                                setTimeout(() => setCopiedSource(false), 2000);
                                            }}
                                            className="text-slate-300 hover:text-white rounded-xl h-8 px-2 cursor-pointer"
                                            title="Kaynak Metni Kopyala"
                                        >
                                            {copiedSource ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 w-full h-full p-4 overflow-hidden relative flex flex-col">
                                    {isEditingSource ? (
                                        <Textarea
                                            value={sourceEditText}
                                            onChange={(e) => setSourceEditText(e.target.value)}
                                            placeholder="Ders kitabı kaynak metnini buraya yapıştırın veya yukarıdaki 'PDF'ten Metin Aktar' butonuyla ders kitabından otomatik aktarın..."
                                            className="w-full h-full bg-slate-950 border-white/10 text-slate-100 font-sans text-sm rounded-2xl p-4 resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 leading-relaxed scrollbar-thin select-text"
                                        />
                                    ) : (
                                        <div className="w-full h-full p-6 overflow-y-auto font-sans text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-text scrollbar-thin bg-slate-900/40 rounded-2xl border border-white/5">
                                            {activeSelectedItem?.sourceText ? (
                                                activeSelectedItem.sourceText
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4 text-slate-400">
                                                    <div className="p-4 rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <BookOpen className="w-12 h-12" />
                                                    </div>
                                                    <div className="space-y-1 max-w-md">
                                                        <h3 className="text-lg font-black text-white">Bu İçerik İçin Henüz Kaynak Metin Girilmemiş</h3>
                                                        <p className="text-slate-400 text-sm">
                                                            Ders kitabınızdan metni kopyalayıp yapıştırabilir veya 'PDF'ten Metin Aktar' butonuyla sayfaları otomatik taratabilirsiniz.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3 pt-2">
                                                        <Button
                                                            onClick={() => setIsEditingSource(true)}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                                                        >
                                                            <Edit3 className="w-4 h-4 mr-2" />
                                                            Metin Girişi Yap
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => pdfFileInputRef.current?.click()}
                                                            className="border-white/10 text-slate-300 hover:text-white rounded-xl cursor-pointer"
                                                        >
                                                            <FileUp className="w-4 h-4 mr-2 text-emerald-400" />
                                                            PDF'ten Çıkar
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── SEKME 2: AKILLI TAHTA ÖZETİ ── */}
                        {activeTab === 'preview' && (
                            <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
                                {activeSelectedItem && (
                                    <div className={cn(
                                        "p-3 px-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors",
                                        activeSelectedItem.type === 'unit'
                                            ? "bg-purple-950/40 border-purple-500/20"
                                            : (activeSelectedItem.sourceText && activeSelectedItem.sourceWordCount > 0
                                                ? "bg-emerald-950/30 border-emerald-500/20"
                                                : "bg-amber-950/30 border-amber-500/20")
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-xl border flex-shrink-0",
                                                activeSelectedItem.type === 'unit' 
                                                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                                                    : (activeSelectedItem.sourceText && activeSelectedItem.sourceWordCount > 0
                                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                                        : "bg-amber-500/20 text-amber-300 border-amber-500/30")
                                            )}>
                                                {activeSelectedItem.type === 'unit' ? <Layers className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                                                        {activeSelectedItem.type === 'unit' 
                                                            ? "Ünite Genel Tekrar Özeti" 
                                                            : (activeSelectedItem.sourceText && activeSelectedItem.sourceWordCount > 0
                                                                ? "Ders Kitabı Kaynak Metni Hazır" 
                                                                : "Kaynak Metin Eksik")}
                                                    </span>
                                                    {activeSelectedItem.sourceText && activeSelectedItem.sourceWordCount > 0 ? (
                                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-mono">
                                                            {activeSelectedItem.sourceWordCount} kelime kaynak
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px]">
                                                            Önce metin ekleyin
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                                            <Button
                                                size="sm"
                                                disabled={isGeneratingAi}
                                                onClick={() => handleAiGenerate(activeSelectedItem)}
                                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl h-8 px-3 text-xs shadow-md shadow-emerald-950/40 cursor-pointer"
                                            >
                                                <Sparkles className={cn("w-3.5 h-3.5 mr-1.5", isGeneratingAi && "animate-spin")} />
                                                {isGeneratingAi ? "Üretiliyor..." : (activeSelectedItem.sourceText ? "✨ Kaynak Metinden Özet Üret" : "AI ile Genel Özet Üret")}
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenEdit(activeSelectedItem)}
                                                className="border-white/10 text-slate-200 hover:text-white bg-slate-900/80 rounded-xl h-8 px-3 text-xs cursor-pointer"
                                            >
                                                <FileText className="w-3.5 h-3.5 mr-1 text-blue-400" />
                                                Düzenle
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                disabled={!activeSelectedItem.htmlContent}
                                                onClick={() => handleCopy(activeSelectedItem.id, activeSelectedItem.htmlContent)}
                                                className="text-slate-300 hover:text-white rounded-xl h-8 px-2 text-xs cursor-pointer"
                                                title="Özet HTML'ini Kopyala"
                                            >
                                                {copiedId === activeSelectedItem.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                            </Button>

                                            {activeSelectedItem.hasOzet && (
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl h-8 px-2 text-xs cursor-pointer"
                                                            title="Özeti Temizle"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-slate-900 border-white/10 text-slate-100 rounded-3xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-lg font-black text-white">Özeti Temizlemek İstediğinize Emin Misiniz?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-slate-400 text-sm">
                                                                <strong>{activeSelectedItem.title}</strong> için kayıtlı özet içeriği silinecektir. Tekrar kaynak metinden özet oluşturabilirsiniz.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-slate-800 text-slate-300 hover:bg-slate-700 border-0 rounded-xl">Vazgeç</AlertDialogCancel>
                                                            <AlertDialogAction 
                                                                onClick={() => handleClearOzet(activeSelectedItem)}
                                                                className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold"
                                                            >
                                                                Evet, Özeti Temizle
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Zoom ve Tam Ekran Kontrolleri */}
                                <div className="px-4 py-2 bg-slate-900/60 border-b border-white/5 flex items-center justify-between text-xs text-slate-400">
                                    <div className="flex items-center gap-2 font-mono">
                                        {activeSelectedItem?.hasOzet ? (
                                            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                {activeSelectedItem.wordCount.toLocaleString('tr-TR')} kelime ({activeSelectedItem.charCount.toLocaleString('tr-TR')} karakter)
                                            </span>
                                        ) : (
                                            <span className="text-amber-400 font-bold flex items-center gap-1.5">
                                                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                                Özet Bulunmuyor
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-white/10">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.1))} 
                                                className="h-7 w-7 text-white hover:bg-white/10 rounded-md cursor-pointer"
                                                title="Küçült"
                                            >
                                                <Minus className="h-3.5 w-3.5" />
                                            </Button>
                                            <span className="text-[10px] font-bold text-slate-300 w-12 text-center font-mono">
                                                %{Math.round(zoomLevel * 100)}
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.1))} 
                                                className="h-7 w-7 text-white hover:bg-white/10 rounded-md cursor-pointer"
                                                title="Büyüt"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                if (!document.fullscreenElement) {
                                                    readerContainerRef.current?.requestFullscreen();
                                                } else {
                                                    document.exitFullscreen();
                                                }
                                            }}
                                            className="h-7 w-7 text-slate-300 hover:text-white rounded-md cursor-pointer"
                                            title="Tam Ekran"
                                        >
                                            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 w-full h-full overflow-hidden relative">
                                    {activeSelectedItem?.htmlContent ? (
                                        <iframe
                                            srcDoc={activeSelectedItem.htmlContent + `<style>body { zoom: ${zoomLevel}; transform-origin: top center; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }</style>`}
                                            className="w-full h-full border-0 bg-white"
                                            title={activeSelectedItem.title}
                                            sandbox="allow-scripts allow-same-origin"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                                            <div className="p-4 rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                <LayoutTemplate className="w-12 h-12" />
                                            </div>
                                            <div className="space-y-1 max-w-md">
                                                <h3 className="text-lg font-black text-white">Bu İçerik İçin Henüz Özet Hazırlanmamış</h3>
                                                <p className="text-slate-400 text-sm">
                                                    {activeSelectedItem?.sourceText 
                                                        ? "Bu konunun ders kitabı kaynak metni hazır. Tek tıkla müfredata %100 sadık interaktif özet üretebilirsiniz."
                                                        : "Bu konu için interaktif özet hazırlayabilir veya önce kaynak metin ekleyip ardından yapay zeka ile üretebilirsiniz."}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
                                                <Button
                                                    onClick={() => activeSelectedItem && handleAiGenerate(activeSelectedItem)}
                                                    disabled={isGeneratingAi}
                                                    className="bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-xl font-bold shadow-lg shadow-purple-950/50 cursor-pointer"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    {isGeneratingAi ? "Üretiliyor..." : (activeSelectedItem?.sourceText ? "Kaynak Metinden AI ile Üret" : "AI ile Otomatik Oluştur")}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => activeSelectedItem && handleOpenEdit(activeSelectedItem)}
                                                    className="border-white/10 text-slate-300 hover:text-white rounded-xl cursor-pointer"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Manuel Özet Yaz
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── SEKME 3: YAN YANA STÜDYO (SPLIT VIEW) ── */}
                        {activeTab === 'split' && (
                            <div className="flex-1 w-full h-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
                                <div className="flex-1 h-full flex flex-col bg-slate-950/90 overflow-hidden">
                                    <div className="p-3 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                                            <BookOpen className="w-4 h-4" />
                                            <span>Ders Kitabı Kaynak Metni ({activeSelectedItem?.sourceWordCount || 0} kelime)</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setActiveTab('source')}
                                            className="text-xs text-emerald-300 hover:text-white h-7 px-2 cursor-pointer"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                                            Düzenle
                                        </Button>
                                    </div>
                                    <div className="flex-1 p-5 overflow-y-auto font-sans text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-text scrollbar-thin">
                                        {activeSelectedItem?.sourceText || 'Bu konu için kaynak metin girilmemiş. "1. Kaynak Metin" sekmesinden metin ekleyebilirsiniz.'}
                                    </div>
                                </div>

                                <div className="flex-1 h-full flex flex-col bg-slate-950/60 overflow-hidden">
                                    <div className="p-3 bg-slate-950 border-b border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                                            <Eye className="w-4 h-4" />
                                            <span>Üretilen İnteraktif Özet ({activeSelectedItem?.wordCount || 0} kelime)</span>
                                        </div>
                                        {activeSelectedItem?.hasOzet ? (
                                            <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                                                Hazır
                                            </Badge>
                                        ) : (
                                            <Badge className="text-[10px] bg-amber-500/20 text-amber-300 border-amber-400/30">
                                                Bekliyor
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full h-full overflow-hidden relative">
                                        {activeSelectedItem?.htmlContent ? (
                                            <iframe
                                                srcDoc={activeSelectedItem.htmlContent + `<style>body { zoom: ${zoomLevel}; transform-origin: top center; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }</style>`}
                                                className="w-full h-full border-0 bg-white"
                                                title="Özet Önizleme"
                                                sandbox="allow-scripts allow-same-origin"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
                                                <p className="text-slate-400 text-sm">Bu içerik için henüz özet üretilmedi.</p>
                                                <Button
                                                    size="sm"
                                                    onClick={() => activeSelectedItem && handleAiGenerate(activeSelectedItem)}
                                                    disabled={isGeneratingAi}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                                    Soldaki Metinden Özet Üret
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── SEKME 4: HTML KODU ── */}
                        {activeTab === 'code' && (
                            <div className="flex-1 w-full h-full p-4 overflow-y-auto font-mono text-xs text-purple-200 bg-slate-950 scrollbar-thin select-text">
                                <pre className="whitespace-pre-wrap break-all leading-relaxed">
                                    {activeSelectedItem?.htmlContent || '<!-- Henüz HTML özet içeriği bulunmuyor -->'}
                                </pre>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ══ PDF ASİSTANI MODALI ══ */}
            <Dialog open={isPdfAssistantOpen} onOpenChange={setIsPdfAssistantOpen}>
                <DialogContent className="max-w-md bg-slate-900 border-white/10 text-slate-100 rounded-3xl p-6 shadow-2xl">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                            <FileUp className="w-5 h-5 text-emerald-400" />
                            <span>PDF Sayfa Aralığı Aktarıcı</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400">
                            <strong>{pdfFileName}</strong> dosyasından istediğiniz sayfa aralığındaki metinleri Türkçe tire birleştirme ve iki sütun düzenine uyumlu şekilde aktarın.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Toplam Sayfa Sayısı:</span>
                            <span className="font-mono font-bold text-white text-sm">{pdfTotalPages} Sayfa</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-300">Başlangıç Sayfası</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={pdfTotalPages}
                                    value={pdfStartPage}
                                    onChange={(e) => setPdfStartPage(e.target.value)}
                                    className="bg-slate-950 border-white/10 text-white rounded-xl h-10 text-center font-mono font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-300">Bitiş Sayfası</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={pdfTotalPages}
                                    value={pdfEndPage}
                                    onChange={(e) => setPdfEndPage(e.target.value)}
                                    className="bg-slate-950 border-white/10 text-white rounded-xl h-10 text-center font-mono font-bold"
                                />
                            </div>
                        </div>

                        {pdfExtractProgress && (
                            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                <span>{pdfExtractProgress}</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between gap-2 pt-2">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsPdfAssistantOpen(false)}
                            className="text-slate-400 hover:text-white rounded-xl"
                        >
                            İptal
                        </Button>
                        <Button
                            onClick={handleExtractFromPdf}
                            disabled={isExtractingPdf}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5 shadow-lg shadow-emerald-950/50"
                        >
                            {isExtractingPdf ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Aktarılıyor...
                                </>
                            ) : (
                                "Metinleri Aktar"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══ ÖZET DÜZENLEME & AI ÖNİZLEME MODALI (HTML DÜZENLEYİCİ) ══ */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="max-w-5xl h-[88vh] flex flex-col bg-slate-900 border-white/10 text-slate-100 rounded-3xl p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="p-5 border-b border-white/10 bg-slate-950/60 flex flex-row items-center justify-between flex-wrap gap-2">
                        <div>
                            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                                <LayoutTemplate className="w-5 h-5 text-purple-400" />
                                <span>{editingItem?.title} - Özet Düzenleyici</span>
                                <Badge className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border-purple-500/30">
                                    {editingItem?.type === 'unit' ? 'ÜNİTE ÖZETİ' : 'KONU ÖZETİ'}
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400">
                                HTML formatında interaktif özet içeriği oluşturun veya düzenleyin.
                            </DialogDescription>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={isGeneratingAi || !editingItem}
                                onClick={() => editingItem && handleAiGenerate(editingItem)}
                                className="border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:text-white rounded-xl h-9 text-xs cursor-pointer"
                            >
                                <Sparkles className={cn("w-3.5 h-3.5 mr-1.5", isGeneratingAi && "animate-spin text-purple-400")} />
                                {isGeneratingAi ? "Üretiliyor..." : "AI ile Yeniden Üret"}
                            </Button>

                            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-white/10">
                                <button
                                    onClick={() => setEditorTab('edit')}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        editorTab === 'edit' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Düzenle (HTML)
                                </button>
                                <button
                                    onClick={() => setEditorTab('preview')}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                        editorTab === 'preview' ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    Canlı Önizleme
                                </button>
                            </div>
                        </div>
                    </DialogHeader>

                    {editorTab === 'edit' && (
                        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">Şablon Ekle:</span>
                            <button onClick={() => insertTemplate('heading')} className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium whitespace-nowrap cursor-pointer">
                                + Başlık
                            </button>
                            <button onClick={() => insertTemplate('callout')} className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-medium whitespace-nowrap cursor-pointer">
                                + Dikkat Kutusu
                            </button>
                            <button onClick={() => insertTemplate('ayah')} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-medium whitespace-nowrap cursor-pointer">
                                + Ayet Meali
                            </button>
                            <button onClick={() => insertTemplate('hadith')} className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-medium whitespace-nowrap cursor-pointer">
                                + Hadis Kutusu
                            </button>
                            <button onClick={() => insertTemplate('concept')} className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-medium whitespace-nowrap cursor-pointer">
                                + Kavram Kartı
                            </button>
                            <button onClick={() => insertTemplate('points')} className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-medium whitespace-nowrap cursor-pointer">
                                + Madde Listesi
                            </button>
                        </div>
                    )}

                    <div className="flex-1 p-4 overflow-hidden relative flex flex-col bg-slate-950/50">
                        {editorTab === 'edit' ? (
                            <Textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                placeholder="Özet HTML kodunu buraya yapıştırın veya yazın..."
                                className="w-full h-full bg-slate-950 border-white/10 text-slate-100 font-mono text-xs rounded-2xl p-4 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 leading-relaxed scrollbar-thin"
                            />
                        ) : (
                            <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-white">
                                {editText.trim() ? (
                                    <iframe
                                        srcDoc={editText + `<style>body { padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }</style>`}
                                        className="w-full h-full border-0 bg-white"
                                        title="Preview"
                                        sandbox="allow-scripts allow-same-origin"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                        Önizlenecek bir HTML içeriği bulunmuyor.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
                        <div className="text-xs font-mono text-slate-400">
                            {editText.length.toLocaleString('tr-TR')} karakter
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="ghost" 
                                onClick={() => setEditingItem(null)} 
                                className="text-slate-400 hover:text-white rounded-xl cursor-pointer"
                            >
                                İptal
                            </Button>
                            <Button
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-xl font-bold px-6 shadow-lg shadow-purple-950/40 cursor-pointer"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Kaydediliyor...
                                    </>
                                ) : (
                                    "Değişiklikleri Kaydet"
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
