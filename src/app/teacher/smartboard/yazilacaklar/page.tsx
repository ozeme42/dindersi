'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Columns, BookOpen, Search, Sparkles, Check, ChevronLeft, ChevronRight,
    Loader2, Save, Wand2, ArrowLeft, Download, Plus, Trash2, Maximize,
    Minimize, ExternalLink, RefreshCw, Layers, BookMarked, Eye, LayoutTemplate,
    ListOrdered, FileText, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle,
    Tag, HelpCircle, AlignLeft, X, Copy, Zap, Info, AlertTriangle, Home,
    GraduationCap, Book as BookIcon, FolderPlus, Library, MonitorPlay
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
    loadAllYazilacaklarData,
    saveCentralActivityDataAction,
    generateCentralActivityAiAction,
    type YazilacaklarTopicItem,
    type ConceptItem
} from './actions';
import { normalizeConcept } from '@/lib/concept-utils';
import { AiActivityStudioDialog } from './ai-activity-studio-dialog';

const COLOR_CLASSES = [
    'bg-indigo-950/60 border-indigo-500/50 text-indigo-100 hover:border-indigo-400',
    'bg-emerald-950/60 border-emerald-500/50 text-emerald-100 hover:border-emerald-400',
    'bg-rose-950/60 border-rose-500/50 text-rose-100 hover:border-rose-400',
    'bg-amber-950/60 border-amber-500/50 text-amber-100 hover:border-amber-400',
    'bg-cyan-950/60 border-cyan-500/50 text-cyan-100 hover:border-cyan-400',
    'bg-fuchsia-950/60 border-fuchsia-500/50 text-fuchsia-100 hover:border-fuchsia-400',
];

// Sınıflara Özel Canlı Neon Renk Temaları
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

function CentralActivityStudioContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    // Data states
    const [items, setItems] = useState<YazilacaklarTopicItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Selection states
    const [selectedGrade, setSelectedGrade] = useState<string>('5');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [expandedUnitIds, setExpandedUnitIds] = useState<string[]>([]); // Varsayılan olarak kapalı!
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Studio Workspace Modal
    const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
    const [selectedTopicId, setSelectedTopicId] = useState<string>('');

    // Studio Tabs: 'concepts' | 'definitions' | 'notes' | 'activitySentences' | 'smartboard' | 'source'
    const [activeTab, setActiveTab] = useState<'concepts' | 'definitions' | 'notes' | 'activitySentences' | 'smartboard' | 'source'>('definitions');

    // ── EDITING STATES FOR ALL 4 TYPES (AYRIŞTIRILMIŞ) ──
    const [editingConcepts, setEditingConcepts] = useState<string[]>([]);
    const [newConceptInput, setNewConceptInput] = useState<string>('');
    const [editingDefinitions, setEditingDefinitions] = useState<ConceptItem[]>([]);
    const [editingNotes, setEditingNotes] = useState<string[]>([]);
    const [editingActivitySentences, setEditingActivitySentences] = useState<string[]>([]);

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState<boolean>(false);

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
                    toast({ title: "Veriler Güncellendi", description: "Etkinlik Veri Bankası ve Defter Notları yüklendi." });
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

    // Extract Unique Grades
    const availableGrades = useMemo(() => {
        const set = new Set<string>();
        items.forEach(i => set.add(i.grade));
        return Array.from(set).sort((a, b) => Number(a) - Number(b));
    }, [items]);

    // Ensure selectedGrade is valid
    useEffect(() => {
        if (availableGrades.length === 0) return;
        if (!availableGrades.includes(selectedGrade)) {
            const grade5 = availableGrades.find(g => g === '5');
            setSelectedGrade(grade5 || availableGrades[0]);
        }
    }, [availableGrades, selectedGrade]);

    // Courses in current grade
    const coursesInGrade = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        items.filter(i => i.grade === selectedGrade).forEach(item => {
            const existing = map.get(item.courseId);
            if (existing) {
                existing.count++;
            } else {
                map.set(item.courseId, { id: item.courseId, title: item.courseTitle, count: 1 });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    }, [items, selectedGrade]);

    // Ensure selectedCourseId is valid
    useEffect(() => {
        if (coursesInGrade.length === 0) {
            setSelectedCourseId('');
            return;
        }
        if (!selectedCourseId || !coursesInGrade.some(c => c.id === selectedCourseId)) {
            setSelectedCourseId(coursesInGrade[0].id);
        }
    }, [coursesInGrade, selectedCourseId]);

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
            topics: YazilacaklarTopicItem[];
        }>();

        items.forEach(item => {
            if (item.grade !== selectedGrade || item.courseId !== selectedCourseId || !item.unitId) return;

            if (!unitMap.has(item.unitId)) {
                unitMap.set(item.unitId, {
                    id: item.unitId,
                    title: item.unitTitle || 'Ünite',
                    topics: []
                });
            }

            unitMap.get(item.unitId)!.topics.push(item);
        });

        const sortedUnits = Array.from(unitMap.values()).sort((a, b) => compareTitles(a.title, b.title));
        sortedUnits.forEach(u => {
            u.topics.sort((a, b) => compareTitles(a.title, b.title));
        });

        return sortedUnits;
    }, [items, selectedGrade, selectedCourseId]);

    // Filtered Units and Topics based on search query
    const displayedUnits = useMemo(() => {
        const queryClean = searchQuery.trim().toLocaleLowerCase('tr');

        return courseUnits.map(unit => {
            if (!queryClean) {
                return unit;
            }

            const unitMatch = unit.title.toLocaleLowerCase('tr').includes(queryClean);
            const matchedTopics = unit.topics.filter(t => 
                t.title.toLocaleLowerCase('tr').includes(queryClean) ||
                t.concepts.some(c => c.toLocaleLowerCase('tr').includes(queryClean)) ||
                t.conceptDefinitions.some(cd => cd.concept.toLocaleLowerCase('tr').includes(queryClean) || cd.definition.toLocaleLowerCase('tr').includes(queryClean)) ||
                t.notes.some(n => n.toLocaleLowerCase('tr').includes(queryClean))
            );

            if (unitMatch) {
                return unit;
            }

            if (matchedTopics.length > 0) {
                return {
                    ...unit,
                    topics: matchedTopics
                };
            }

            return null;
        }).filter(Boolean) as typeof courseUnits;
    }, [courseUnits, searchQuery]);

    // Parse URL query parameters on initial load
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const courseParam = params.get('courseId') || params.get('course');
        const topicParam = params.get('topicId') || params.get('topic');
        const tabParam = params.get('tab');

        if (['concepts', 'definitions', 'notes', 'activitySentences', 'smartboard', 'source'].includes(tabParam || '')) {
            setActiveTab(tabParam as any);
        }

        if (courseParam) setSelectedCourseId(courseParam);

        if (topicParam && items.length > 0) {
            const found = items.find(i => i.topicId === topicParam);
            if (found) {
                setSelectedTopicId(found.topicId);
                setSelectedGrade(found.grade);
                setSelectedCourseId(found.courseId);
                setIsStudioOpen(true);
            }
        }
    }, [items]);

    // Selected Course Object
    const selectedCourse = useMemo(() => {
        return coursesInGrade.find(c => c.id === selectedCourseId);
    }, [coursesInGrade, selectedCourseId]);

    // Currently Active Topic
    const activeTopic = useMemo(() => {
        return items.find(i => i.topicId === selectedTopicId) || null;
    }, [items, selectedTopicId]);

    // Sequential Navigation inside Active Unit in Modal
    const topicsInCurrentUnit = useMemo(() => {
        if (!activeTopic) return [];
        return items
            .filter(i => i.grade === activeTopic.grade && i.courseId === activeTopic.courseId && i.unitId === activeTopic.unitId)
            .sort((a, b) => compareTitles(a.title, b.title));
    }, [items, activeTopic]);

    const activeTopicIndex = useMemo(() => {
        return topicsInCurrentUnit.findIndex(t => t.topicId === activeTopic?.topicId);
    }, [topicsInCurrentUnit, activeTopic]);

    const prevTopic = activeTopicIndex > 0 ? topicsInCurrentUnit[activeTopicIndex - 1] : null;
    const nextTopic = activeTopicIndex >= 0 && activeTopicIndex < topicsInCurrentUnit.length - 1 ? topicsInCurrentUnit[activeTopicIndex + 1] : null;

    // Open Topic Studio Modal
    const openTopicStudio = (topic: YazilacaklarTopicItem) => {
        setSelectedTopicId(topic.topicId);
        setEditingConcepts(topic.concepts || []);
        setEditingDefinitions(topic.conceptDefinitions || []);
        setEditingNotes(topic.notes || []);
        setEditingActivitySentences(topic.activitySentences || (topic as any).sentences || []);
        setHasUnsavedChanges(false);
        setIsStudioOpen(true);
    };

    // Toggle Expand All Units
    const handleToggleExpandAll = () => {
        if (expandedUnitIds.length === courseUnits.length) {
            setExpandedUnitIds([]);
        } else {
            setExpandedUnitIds(courseUnits.map(u => u.id));
        }
    };

    // ── KAVRAM - TANIM EŞLEŞTİRME & EKSİK TANIM HESAPLAMALARI ──
    const definedConceptsMap = useMemo(() => {
        const map = new Map<string, string>();
        editingDefinitions.forEach(d => {
            const norm = normalizeConcept(d.concept);
            if (norm && d.definition && d.definition.trim()) {
                map.set(norm, d.definition.trim());
            }
        });
        return map;
    }, [editingDefinitions]);

    const missingDefinitionConcepts = useMemo(() => {
        const seenNorms = new Set<string>();
        const missing: string[] = [];
        editingConcepts.forEach(c => {
            const norm = normalizeConcept(c);
            if (!norm || seenNorms.has(norm)) return;
            seenNorms.add(norm);
            if (!definedConceptsMap.has(norm)) {
                missing.push(c);
            }
        });
        return missing;
    }, [editingConcepts, definedConceptsMap]);

    const definedConceptsCount = useMemo(() => {
        const seen = new Set<string>();
        let count = 0;
        editingConcepts.forEach(c => {
            const norm = normalizeConcept(c);
            if (norm && !seen.has(norm)) {
                seen.add(norm);
                if (definedConceptsMap.has(norm)) {
                    count++;
                }
            }
        });
        return count;
    }, [editingConcepts, definedConceptsMap]);

    const emptyDefinitionCardCount = useMemo(() => {
        return editingDefinitions.filter(d => !d.definition || !d.definition.trim()).length;
    }, [editingDefinitions]);

    // ── 1. KAVRAMLAR (KELİMELER) HANDLERS ──
    const handleAddConcept = (word: string) => {
        const trimmed = word.trim();
        if (!trimmed) return;
        const norm = normalizeConcept(trimmed);
        if (editingConcepts.some(c => normalizeConcept(c) === norm)) {
            toast({ title: "Bilgi", description: "Bu kavram zaten listede var.", variant: "default" });
            return;
        }
        setEditingConcepts(prev => [...prev, trimmed]);
        setNewConceptInput('');
        setHasUnsavedChanges(true);
    };

    const handleAddMultipleConcepts = (rawText: string) => {
        if (!rawText.trim()) return;
        const tokens = rawText.split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
        let addedCount = 0;
        setEditingConcepts(prev => {
            const next = [...prev];
            tokens.forEach(tok => {
                const norm = normalizeConcept(tok);
                if (norm && !next.some(c => normalizeConcept(c) === norm)) {
                    next.push(tok);
                    addedCount++;
                }
            });
            return next;
        });
        setNewConceptInput('');
        if (addedCount > 0) {
            setHasUnsavedChanges(true);
            toast({ title: "Eklendi", description: `${addedCount} yeni kelime/kavram havuza eklendi.` });
        }
    };

    const handleRemoveConcept = (index: number) => {
        setEditingConcepts(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    const handleQuickAddDefinitionForConcept = (conceptName: string) => {
        const trimmed = conceptName.trim();
        if (!trimmed) return;
        const norm = normalizeConcept(trimmed);

        const existingIdx = editingDefinitions.findIndex(
            d => normalizeConcept(d.concept) === norm
        );

        if (existingIdx === -1) {
            setEditingDefinitions(prev => [{ concept: trimmed, definition: '' }, ...prev]);
        }

        setActiveTab('definitions');
        setHasUnsavedChanges(true);
        toast({
            title: "Tanım Kartı Açıldı",
            description: `"${trimmed}" kavramı için kart hazırlandı. Tanımını yazabilirsiniz.`
        });
    };

    const handleAddCardsForMissingConcepts = () => {
        if (missingDefinitionConcepts.length === 0) return;

        const newCards: ConceptItem[] = [];
        missingDefinitionConcepts.forEach(conceptName => {
            const norm = normalizeConcept(conceptName);
            const exists = editingDefinitions.some(
                d => normalizeConcept(d.concept) === norm
            );
            if (!exists) {
                newCards.push({ concept: conceptName, definition: '' });
            }
        });

        if (newCards.length > 0) {
            setEditingDefinitions(prev => [...newCards, ...prev]);
            setHasUnsavedChanges(true);
            toast({
                title: "Tanım Kartları Eklendi",
                description: `${newCards.length} adet tanımsız kavram için tanım kartı açıldı.`
            });
        }
    };

    const handleGenerateAiForMissingDefinitions = async () => {
        if (!activeTopic || missingDefinitionConcepts.length === 0) return;
        setIsGeneratingAi(true);

        toast({
            title: "Eksik Tanımlar Üretiliyor...",
            description: `${missingDefinitionConcepts.length} adet tanımsız kavram için AI tanım hazırlıyor...`
        });

        try {
            const res = await generateCentralActivityAiAction({
                sourceText: activeTopic.sourceText,
                topicTitle: activeTopic.title,
                grade: activeTopic.grade,
                courseTitle: activeTopic.courseTitle,
                mode: 'definitions',
                targetConcepts: missingDefinitionConcepts
            });

            if (res.success && res.conceptDefinitions && res.conceptDefinitions.length > 0) {
                let filledCount = 0;
                setEditingDefinitions(prev => {
                    const currentMap = new Map<string, { concept: string; definition: string }>();
                    prev.forEach(item => {
                        const norm = normalizeConcept(item.concept);
                        if (norm) currentMap.set(norm, { concept: item.concept, definition: item.definition });
                    });

                    res.conceptDefinitions!.forEach(newDef => {
                        const norm = normalizeConcept(newDef.concept);
                        if (norm && newDef.definition && newDef.definition.trim()) {
                            const existing = currentMap.get(norm);
                            if (existing) {
                                existing.definition = newDef.definition.trim();
                                if (newDef.concept.length > existing.concept.length || /[îâû'’]/i.test(newDef.concept)) {
                                    existing.concept = newDef.concept;
                                }
                            } else {
                                currentMap.set(norm, { concept: newDef.concept, definition: newDef.definition.trim() });
                            }
                            filledCount++;
                        }
                    });

                    const resultList: ConceptItem[] = [];
                    const usedKeys = new Set<string>();

                    prev.forEach(item => {
                        const norm = normalizeConcept(item.concept);
                        if (norm && currentMap.has(norm)) {
                            resultList.push(currentMap.get(norm)!);
                            usedKeys.add(norm);
                        } else {
                            resultList.push(item);
                        }
                    });

                    currentMap.forEach((val, key) => {
                        if (!usedKeys.has(key)) {
                            resultList.push(val);
                        }
                    });

                    return resultList;
                });

                setHasUnsavedChanges(true);
                toast({
                    title: "Eksik Tanımlar Dolduruldu! ✨",
                    description: `${filledCount} adet kavramın tanımı yapay zeka ile başarıyla oluşturuldu.`,
                    className: "bg-purple-950 border-purple-500 text-white"
                });
            } else {
                toast({ title: "AI Üretim Hatası", description: res.error || "Tanımlar üretilemedi.", variant: "destructive" });
            }
        } catch (err: any) {
            console.error("AI missing definitions error:", err);
            toast({ title: "Hata", description: err.message || "Yapay zeka yanıt vermedi.", variant: "destructive" });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // ── 2. KAVRAM-TANIM ÇİFTLERİ HANDLERS ──
    const handleAddDefinition = () => {
        setEditingDefinitions(prev => [...prev, { concept: '', definition: '' }]);
        setHasUnsavedChanges(true);
    };

    const handleDefinitionChange = (index: number, field: 'concept' | 'definition', val: string) => {
        setEditingDefinitions(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const handleRemoveDefinition = (index: number) => {
        setEditingDefinitions(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // ── 3. DEFTERE YAZILACAK ÖZET NOTLAR HANDLERS ──
    const handleAddNote = () => {
        setEditingNotes(prev => [...prev, '']);
        setHasUnsavedChanges(true);
    };

    const handleNoteChange = (index: number, val: string) => {
        setEditingNotes(prev => {
            const next = [...prev];
            next[index] = val;
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const handleRemoveNote = (index: number) => {
        setEditingNotes(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    // ── 4. KISA ETKİNLİK CÜMLELERİ HANDLERS ──
    const handleAddActivitySentence = () => {
        setEditingActivitySentences(prev => [...prev, '']);
        setHasUnsavedChanges(true);
    };

    const handleActivitySentenceChange = (index: number, val: string) => {
        setEditingActivitySentences(prev => {
            const next = [...prev];
            next[index] = val;
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const handleRemoveActivitySentence = (index: number) => {
        setEditingActivitySentences(prev => prev.filter((_, i) => i !== index));
        setHasUnsavedChanges(true);
    };

    const handleTransferNotesToActivitySentences = () => {
        if (editingNotes.length === 0) return;
        let count = 0;
        setEditingActivitySentences(prev => {
            const next = [...prev];
            editingNotes.forEach(note => {
                const clean = note.replace(/^[0-9]+[\.\-\)]\s*/, '').trim();
                if (clean && !next.includes(clean)) {
                    next.push(clean);
                    count++;
                }
            });
            return next;
        });
        setHasUnsavedChanges(true);
        toast({
            title: "Cümleler Aktarıldı",
            description: `${count} adet not maddesi oyun cümleleri havuzuna kopyalandı.`
        });
    };

    // ── MERKEZİ KAYDETME & SENKRONİZASYON ──
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
                notes: editingNotes,
                activitySentences: editingActivitySentences
            });

            if (res.success) {
                toast({
                    title: "Başarıyla Kaydedildi & Senkronize Edildi!",
                    description: "Kelimeler, Tanımlar, Defter Notları ve Oyun Cümleleri tüm dosya ve oyunlara yansıtıldı.",
                    className: "bg-emerald-950 border-emerald-500 text-white"
                });
                setHasUnsavedChanges(false);

                // Update local items state
                setItems(prev => prev.map(item => {
                    if (item.topicId === activeTopic.topicId) {
                        return {
                            ...item,
                            concepts: editingConcepts,
                            conceptDefinitions: editingDefinitions,
                            notes: editingNotes,
                            activitySentences: editingActivitySentences,
                            sentences: editingActivitySentences,
                            conceptsCount: editingConcepts.length,
                            definitionsCount: editingDefinitions.length,
                            notesCount: editingNotes.length,
                            activitySentencesCount: editingActivitySentences.length,
                            hasContent: true
                        };
                    }
                    return item;
                }));
            } else {
                toast({ title: "Kaydetme Hatası", description: res.error, variant: "destructive" });
            }
        } catch (err: any) {
            console.error("Save error:", err);
            toast({ title: "Hata", description: err.message || "Kaydedilemedi.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // ── YAPAY ZEKA ÜRETİMİ (HER SEKME İÇİN AYRI) ──
    const handleGenerateAi = async (mode: 'all' | 'concepts' | 'definitions' | 'notes' | 'activitySentences' = 'all') => {
        if (!activeTopic) return;
        setIsGeneratingAi(true);

        toast({
            title: "Yapay Zeka Çalışıyor...",
            description: mode === 'all'
                ? "Ders kitabı metni taranıyor (Kelimeler, Tanımlar, Defter Notları ve Oyun Cümleleri)..."
                : `${mode === 'concepts' ? 'Kelimeler' : mode === 'definitions' ? 'Kavram-Tanım Eşleşmeleri' : mode === 'notes' ? 'Defter Notları' : 'Kısa Oyun Cümleleri'} üretiliyor...`,
        });

        try {
            const res = await generateCentralActivityAiAction({
                sourceText: activeTopic.sourceText,
                topicTitle: activeTopic.title,
                grade: activeTopic.grade,
                courseTitle: activeTopic.courseTitle,
                mode
            });

            if (res.success) {
                let updatedMsg: string[] = [];

                if (mode === 'all' || mode === 'concepts') {
                    if (res.concepts && res.concepts.length > 0) {
                        setEditingConcepts(res.concepts);
                        updatedMsg.push(`${res.concepts.length} kavram`);
                    }
                }
                if (mode === 'all' || mode === 'definitions') {
                    if (res.conceptDefinitions && res.conceptDefinitions.length > 0) {
                        setEditingDefinitions(res.conceptDefinitions);
                        updatedMsg.push(`${res.conceptDefinitions.length} tanım çifti`);
                    }
                }
                if (mode === 'all' || mode === 'notes') {
                    if (res.notes && res.notes.length > 0) {
                        setEditingNotes(res.notes);
                        updatedMsg.push(`${res.notes.length} defter notu`);
                    }
                }
                if (mode === 'all' || mode === 'activitySentences') {
                    if (res.activitySentences && res.activitySentences.length > 0) {
                        setEditingActivitySentences(res.activitySentences);
                        updatedMsg.push(`${res.activitySentences.length} kısa oyun cümlesi`);
                    }
                }

                setHasUnsavedChanges(true);
                toast({
                    title: "Yapay Zeka İçerikleri Hazırladı! ✨",
                    description: `${updatedMsg.join(', ')} oluşturuldu. Kontrol edip 'Kaydet' butonuna basabilirsiniz.`,
                    className: "bg-purple-950 border-purple-500 text-white"
                });
            } else {
                toast({ title: "AI Üretim Hatası", description: res.error, variant: "destructive" });
            }
        } catch (err: any) {
            console.error("AI error:", err);
            toast({ title: "Hata", description: err.message || "Yapay zeka içeriği oluşturamadı.", variant: "destructive" });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // ── AI STÜDYO DIALOGUNDAN GELEN VERİLERİ MERGE ETME ──
    const handleAiDataGenerated = (data: {
        concepts?: string[];
        conceptDefinitions?: ConceptItem[];
        notes?: string[];
        activitySentences?: string[];
    }) => {
        if (data.concepts && data.concepts.length > 0) {
            setEditingConcepts(data.concepts);
        }
        if (data.conceptDefinitions && data.conceptDefinitions.length > 0) {
            setEditingDefinitions(prev => {
                const currentMap = new Map<string, { concept: string; definition: string }>();
                prev.forEach(item => {
                    const norm = normalizeConcept(item.concept);
                    if (norm) currentMap.set(norm, { concept: item.concept, definition: item.definition });
                });
                data.conceptDefinitions!.forEach(newDef => {
                    const norm = normalizeConcept(newDef.concept);
                    if (norm && newDef.definition && newDef.definition.trim()) {
                        const existing = currentMap.get(norm);
                        if (existing) {
                            existing.definition = newDef.definition.trim();
                            if (newDef.concept.length > existing.concept.length || /[îâû'’]/i.test(newDef.concept)) {
                                existing.concept = newDef.concept;
                            }
                        } else {
                            currentMap.set(norm, { concept: newDef.concept, definition: newDef.definition.trim() });
                        }
                    }
                });
                const resultList: ConceptItem[] = [];
                const usedKeys = new Set<string>();
                prev.forEach(item => {
                    const norm = normalizeConcept(item.concept);
                    if (norm && currentMap.has(norm)) {
                        resultList.push(currentMap.get(norm)!);
                        usedKeys.add(norm);
                    } else {
                        resultList.push(item);
                    }
                });
                currentMap.forEach((val, key) => {
                    if (!usedKeys.has(key)) resultList.push(val);
                });
                return resultList;
            });
        }
        if (data.notes && data.notes.length > 0) {
            setEditingNotes(data.notes);
        }
        if (data.activitySentences && data.activitySentences.length > 0) {
            setEditingActivitySentences(data.activitySentences);
        }
        setHasUnsavedChanges(true);
    };

    // PDF / Yazdır
    const handleDownloadPdf = () => {
        if (!activeTopic) return;
        setIsDownloadingPdf(true);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${activeTopic.title} - Defter Notları ve Kavramlar</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                        h1 { color: #4338ca; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 8px; font-size: 24px; }
                        .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; font-weight: 500; }
                        h2 { color: #0f172a; margin-top: 28px; margin-bottom: 14px; font-size: 18px; border-left: 4px solid #6366f1; padding-left: 10px; }
                        .note-item { margin-bottom: 10px; padding: 8px 12px; background: #f8fafc; border-left: 3px solid #cbd5e1; font-size: 14px; }
                        .concept-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
                        .concept-card { border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; background: #ffffff; }
                        .concept-title { font-weight: bold; color: #4338ca; margin-bottom: 4px; font-size: 15px; }
                        .concept-def { font-size: 13px; color: #334155; }
                        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                        @media print { body { padding: 20px; } }
                    </style>
                </head>
                <body>
                    <h1>${activeTopic.title}</h1>
                    <div class="meta">${activeTopic.className} • ${activeTopic.courseTitle} • ${activeTopic.unitTitle}</div>
            `;

            if (editingDefinitions.length > 0) {
                htmlContent += `
                    <h2>📖 Önemli Kavramlar ve Tanımları</h2>
                    <div class="concept-grid">
                `;
                editingDefinitions.forEach(cd => {
                    htmlContent += `
                        <div class="concept-card">
                            <div class="concept-title">${cd.concept}</div>
                            <div class="concept-def">${cd.definition}</div>
                        </div>
                    `;
                });
                htmlContent += `</div>`;
            }

            if (editingNotes.length > 0) {
                htmlContent += `<h2>✍️ Deftere Yazılacak Özet Notlar</h2>`;
                editingNotes.forEach((note, idx) => {
                    htmlContent += `<div class="note-item"><strong>${idx + 1}.</strong> ${note}</div>`;
                });
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
                    <p className="text-slate-400 font-bold text-lg">Kavram & Notlar Stüdyosu Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-3 sm:p-5 md:p-8 relative overflow-x-hidden">
            {/* Kozmik Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[750px] h-[750px] bg-purple-900/10 rounded-full blur-[160px]" />
                <div className="absolute top-[20%] right-[-10%] w-[650px] h-[650px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[30%] w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[160px]" />
            </div>

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
                                    Kavram & Notlar Stüdyosu
                                </h1>
                                <Badge variant="outline" className="bg-purple-950/60 border-purple-500/30 text-purple-300 text-[11px] font-bold px-2 py-0.5">
                                    Merkezi Veri Bankası
                                </Badge>
                            </div>
                            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                                Kelimeler, Tanımlar, Defter Notları ve Etkinlik Cümlelerini tek merkezden yönetin ve akıllı tahtada oynatın.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
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

                        {/* Hızlı Bilgi */}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span className="bg-slate-950/60 px-3 py-1.5 rounded-xl border border-white/8 font-medium">
                                <strong className="text-purple-300 font-bold">{coursesInGrade.length}</strong> Ders Mevcut
                            </span>
                        </div>
                    </div>

                    {/* 2. SATIR: DERS SEÇİMİ (SEÇİLİ SINIFIN DERSLERİ) */}
                    {coursesInGrade.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pt-2.5 border-t border-white/8">
                            <span className="text-xs font-black tracking-wider uppercase text-slate-400 px-1 flex-shrink-0 flex items-center gap-1.5">
                                <BookIcon className="w-4 h-4 text-purple-400" /> Ders:
                            </span>
                            <div className="flex items-center gap-2 overflow-x-auto py-0.5 flex-1">
                                {coursesInGrade.map((course, idx) => {
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
                                placeholder="Ünite, konu, kavram veya not ara..."
                                className="pl-10 h-10 bg-slate-900/60 border-white/10 text-xs text-white rounded-xl placeholder:text-slate-500 focus:border-purple-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
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
                            <p className="text-sm text-slate-400 font-medium">Müfredat ve kavram stüdyosu yükleniyor...</p>
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
                                const totalConcepts = unit.topics.reduce((acc, t) => acc + (t.concepts?.length || 0), 0);
                                const totalDefs = unit.topics.reduce((acc, t) => acc + (t.conceptDefinitions?.length || 0), 0);
                                const totalNotes = unit.topics.reduce((acc, t) => acc + (t.notes?.length || 0), 0);
                                const unitPlayUrl = `/teacher/smartboard/yazilacaklar/oyun?courseId=${selectedCourseId}&unitId=${unit.id}`;

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
                                                            <Badge variant="outline" className="bg-blue-950/60 text-blue-300 border-blue-500/30 text-[10px] px-2 py-0">
                                                                🧩 {totalConcepts} Kavram
                                                            </Badge>
                                                            <Badge variant="outline" className="bg-purple-950/60 text-purple-300 border-purple-500/30 text-[10px] px-2 py-0">
                                                                📖 {totalDefs} Tanım
                                                            </Badge>
                                                            <Badge variant="outline" className="bg-indigo-950/60 text-indigo-300 border-indigo-500/30 text-[10px] px-2 py-0">
                                                                ✍️ {totalNotes} Not
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>

                                            {/* Sağ: Ünite İşlem Butonları */}
                                            <div
                                                className="flex items-center gap-2 flex-wrap flex-shrink-0 self-end lg:self-center"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    className="bg-purple-600/40 hover:bg-purple-600 border border-purple-500/40 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
                                                    title="Ünite Genel Oyununu Başlat"
                                                >
                                                    <Link href={unitPlayUrl} target="_blank">
                                                        <MonitorPlay className="h-3.5 w-3.5 mr-1.5 text-yellow-300" />
                                                        Ünite Oyununu Aç
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>

                                        {/* ── ÜNİTE İÇERİĞİ: KONU KARTLARI IZGARASI ── */}
                                        <AccordionContent className="p-4 sm:p-5 bg-black/30 border-t border-white/5">
                                            {unit.topics.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                                    {unit.topics.map((topic, topicIdx) => {
                                                        const topicPlayUrl = `/teacher/smartboard/yazilacaklar/oyun?courseId=${selectedCourseId}&unitId=${unit.id}&topicId=${topic.topicId}`;
                                                        const hasItems = topic.concepts.length > 0 || topic.conceptDefinitions.length > 0 || topic.notes.length > 0;

                                                        return (
                                                            <div
                                                                key={topic.topicId}
                                                                className={cn(
                                                                    "group relative rounded-2xl border transition-all duration-300 p-4 flex flex-col justify-between shadow-lg hover:-translate-y-0.5",
                                                                    hasItems
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
                                                                            {topic.concepts.length > 0 && (
                                                                                <span className="text-[10px] font-bold text-blue-300 bg-blue-950/60 border border-blue-500/30 px-1.5 py-0.5 rounded-md font-mono" title="Kavram Sayısı">
                                                                                    {topic.concepts.length} Kavram
                                                                                </span>
                                                                            )}
                                                                            {topic.conceptDefinitions.length > 0 && (
                                                                                <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.5 rounded-md font-mono" title="Tanım Sayısı">
                                                                                    {topic.conceptDefinitions.length} Tanım
                                                                                </span>
                                                                            )}
                                                                            {topic.notes.length > 0 && (
                                                                                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.5 rounded-md font-mono" title="Defter Notu Sayısı">
                                                                                    {topic.notes.length} Not
                                                                                </span>
                                                                            )}
                                                                            {topic.activitySentences.length > 0 && (
                                                                                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-md font-mono" title="Etkinlik Cümlesi">
                                                                                    {topic.activitySentences.length} Cümle
                                                                                </span>
                                                                            )}
                                                                            {!hasItems && (
                                                                                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                                                                    İçerik Yok
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Konu Başlığı */}
                                                                    <button
                                                                        onClick={() => openTopicStudio(topic)}
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
                                                                        onClick={() => openTopicStudio(topic)}
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
                                                                        title="Akıllı Tahtada Oyna"
                                                                    >
                                                                        <Link href={topicPlayUrl} target="_blank">
                                                                            <MonitorPlay className="h-3.5 w-3.5 text-rose-400" />
                                                                        </Link>
                                                                    </Button>

                                                                    {/* Hızlı AI ile Üret */}
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            setSelectedTopicId(topic.topicId);
                                                                            setIsAiDialogOpen(true);
                                                                        }}
                                                                        className="h-8 w-8 text-slate-400 hover:text-yellow-300 hover:bg-yellow-950/30 rounded-xl cursor-pointer"
                                                                        title="Yapay Zeka ile Otomatik Doldur"
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
            <Dialog open={isStudioOpen} onOpenChange={setIsStudioOpen}>
                <DialogContent className="max-w-7xl w-[96vw] h-[92vh] flex flex-col bg-slate-900 border-white/10 text-slate-100 rounded-3xl p-0 overflow-hidden shadow-2xl">
                    {/* Stüdyo Başlık Çubuğu */}
                    <DialogHeader className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium flex-wrap">
                                <span className="text-purple-400 font-bold">{selectedGrade}. Sınıf</span>
                                <span>›</span>
                                <span className="truncate max-w-[140px]">{selectedCourse?.title}</span>
                                <span>›</span>
                                <span className="truncate max-w-[160px] text-slate-300">{activeTopic?.unitTitle}</span>
                                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-[10px] font-black uppercase px-2 py-0.5 ml-1">
                                    KONU STÜDYOSU
                                </Badge>
                                {hasUnsavedChanges && (
                                    <Badge className="bg-amber-500/30 border border-amber-400 text-amber-200 text-[10px] font-black animate-pulse">
                                        ● Kaydedilmemiş Değişiklikler Var!
                                    </Badge>
                                )}
                            </div>
                            <DialogTitle className="text-lg sm:text-xl font-black text-white truncate flex items-center gap-2">
                                {activeTopic?.title}
                            </DialogTitle>
                        </div>

                        {/* Önceki & Sonraki Butonları ve Eylemler */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!prevTopic}
                                onClick={() => prevTopic && openTopicStudio(prevTopic)}
                                className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-8 px-2.5 text-xs cursor-pointer"
                                title={prevTopic ? `Önceki: ${prevTopic.title}` : 'Önceki konu yok'}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!nextTopic}
                                onClick={() => nextTopic && openTopicStudio(nextTopic)}
                                className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-8 px-2.5 text-xs cursor-pointer"
                                title={nextTopic ? `Sonraki: ${nextTopic.title}` : 'Sonraki konu yok'}
                            >
                                Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>

                            {/* AI Stüdyosu Butonu */}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsAiDialogOpen(true)}
                                className="border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 hover:text-white rounded-xl h-8 px-3 text-xs font-bold cursor-pointer"
                            >
                                <Wand2 className="w-3.5 h-3.5 mr-1 text-purple-400" />
                                AI Stüdyosu
                            </Button>

                            {/* PDF İndir */}
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleDownloadPdf}
                                disabled={isDownloadingPdf}
                                className="border-white/10 text-slate-300 hover:text-white bg-slate-900/60 rounded-xl h-8 px-3 text-xs cursor-pointer"
                                title="Notları ve Kavramları PDF / Yazdır"
                            >
                                <Download className="w-3.5 h-3.5 mr-1" />
                                PDF / Yazdır
                            </Button>

                            {/* Akıllı Tahtada Başlat */}
                            {activeTopic && (
                                <Button
                                    asChild
                                    size="sm"
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl h-8 px-3 text-xs shadow-md shadow-cyan-950/40 cursor-pointer"
                                >
                                    <Link href={smartboardPlayUrl} target="_blank">
                                        <Maximize className="w-3.5 h-3.5 mr-1" />
                                        Tahtada Başlat
                                    </Link>
                                </Button>
                            )}

                            {/* Kaydet & Senkronize Et */}
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                                className={cn(
                                    "font-bold rounded-xl h-8 px-4 text-xs transition-all shadow-md cursor-pointer",
                                    hasUnsavedChanges
                                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-950/50 ring-2 ring-emerald-400/40 animate-pulse"
                                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                )}
                            >
                                <Save className={cn("w-3.5 h-3.5 mr-1.5", isSaving && "animate-spin")} />
                                {isSaving ? "Kaydediliyor..." : hasUnsavedChanges ? "Değişiklikleri Kaydet!" : "Kaydet & Senkronize Et"}
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Stüdyo 6 Temel Çalışma Sekmesi */}
                    <div className="px-4 py-2 bg-slate-950/50 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-white/10 flex-wrap">
                            <button
                                onClick={() => setActiveTab('definitions')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'definitions' ? "bg-purple-600 text-white shadow-md shadow-purple-950/40" : "text-purple-300 hover:text-white"
                                )}
                            >
                                <Columns className="w-3.5 h-3.5" />
                                <span>1. Kavram-Tanım Eşleşmeli</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/20 rounded">
                                    {editingDefinitions.length}
                                </span>
                                {emptyDefinitionCardCount > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('concepts')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'concepts' ? "bg-blue-600 text-white shadow-md shadow-blue-950/40" : "text-blue-300 hover:text-white"
                                )}
                            >
                                <Tag className="w-3.5 h-3.5" />
                                <span>2. Kelime Havuzu</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/20 rounded">
                                    {editingConcepts.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('notes')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'notes' ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40" : "text-indigo-300 hover:text-white"
                                )}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>3. Deftere Yazılacak Notlar</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/20 rounded">
                                    {editingNotes.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('activitySentences')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'activitySentences' ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40" : "text-emerald-300 hover:text-white"
                                )}
                            >
                                <ListOrdered className="w-3.5 h-3.5" />
                                <span>4. Etkinlik Cümleleri</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/20 rounded">
                                    {editingActivitySentences.length}
                                </span>
                            </button>

                            <button
                                onClick={() => setActiveTab('smartboard')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'smartboard' ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/40" : "text-cyan-300 hover:text-white"
                                )}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>5. Akıllı Tahta Önizleme</span>
                            </button>

                            <button
                                onClick={() => setActiveTab('source')}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                    activeTab === 'source' ? "bg-slate-700 text-white shadow-md" : "text-slate-400 hover:text-white"
                                )}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>6. Ders Kitabı Metni</span>
                            </button>
                        </div>
                    </div>

                    {/* Stüdyo Çalışma Masası Gövdesi */}
                    <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
                        
                        {/* ── 1. KAVRAM-TANIM EŞLEŞMELİ SEKMESİ ── */}
                        {activeTab === 'definitions' && (
                            <div className="space-y-4 max-w-5xl mx-auto">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-purple-500/30 gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Columns className="w-4 h-4 text-purple-400" />
                                            <span>Kavram - Tanım Eşleşmeleri</span>
                                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px]">
                                                {editingDefinitions.length} Eşleşme
                                            </Badge>
                                            {emptyDefinitionCardCount > 0 && (
                                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold animate-pulse">
                                                    ⚠️ {emptyDefinitionCardCount} Kartta Tanım Boş
                                                </Badge>
                                            )}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Kavram Düellosu, Hafıza Kartları, Eşleştirme oyunları ve Akıllı Tahta Kavram Panosu için kullanılır.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {missingDefinitionConcepts.length > 0 && (
                                            <Button
                                                onClick={handleGenerateAiForMissingDefinitions}
                                                disabled={isGeneratingAi || !activeTopic}
                                                size="sm"
                                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-950/50 cursor-pointer"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> Eksikleri AI İle Tamamla ({missingDefinitionConcepts.length})
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleGenerateAi('definitions')}
                                            disabled={isGeneratingAi || !activeTopic}
                                            variant="outline"
                                            size="sm"
                                            className="border-purple-500/30 text-purple-300 hover:bg-purple-950/50 hover:text-white rounded-xl text-xs cursor-pointer"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Tümünü Üret
                                        </Button>
                                        <Button
                                            onClick={handleAddDefinition}
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Yeni Kart Ekle
                                        </Button>
                                    </div>
                                </div>

                                {/* Tanımı Eksik Kavramlar İçin Uyarı Panosu */}
                                {missingDefinitionConcepts.length > 0 && (
                                    <div className="p-4 bg-amber-950/30 border border-amber-500/50 rounded-2xl space-y-2.5 shadow-xl">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                                                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                                                <span>Tanımı Eksik Olan Kavramlar ({missingDefinitionConcepts.length} Adet):</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={handleAddCardsForMissingConcepts}
                                                    variant="outline"
                                                    className="border-amber-500/50 text-amber-300 hover:bg-amber-900/40 text-[11px] h-7 px-2.5 rounded-lg font-bold cursor-pointer"
                                                >
                                                    <Plus className="w-3 h-3 mr-1" /> Boş Kart Olarak Aç
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleGenerateAiForMissingDefinitions}
                                                    disabled={isGeneratingAi}
                                                    className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] h-7 px-2.5 rounded-lg font-bold shadow cursor-pointer"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-200" /> AI İle Tanımla
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {missingDefinitionConcepts.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => handleQuickAddDefinitionForConcept(c)}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-900/50 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                                                    title="Tıklayarak bu kavram için tanım yazın"
                                                >
                                                    <span>{c}</span>
                                                    <span className="text-[10px] text-amber-400 underline font-bold">+ Tanım Yaz</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tanımlar Listesi */}
                                {editingDefinitions.length > 0 ? (
                                    <div className="space-y-3">
                                        {editingDefinitions.map((item, idx) => {
                                            const isDefEmpty = !item.definition || !item.definition.trim();
                                            return (
                                                <div
                                                    key={idx}
                                                    className={cn(
                                                        "rounded-2xl p-4 transition-all space-y-3 group border",
                                                        isDefEmpty
                                                           ? "bg-amber-950/25 border-2 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                                                           : "bg-slate-900/90 border-white/10 hover:border-purple-500/40"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                                                            <span className={cn(
                                                                "w-6 h-6 rounded-lg font-mono text-xs flex items-center justify-center font-bold",
                                                                isDefEmpty
                                                                    ? "bg-amber-500/30 border border-amber-400 text-amber-300"
                                                                    : "bg-purple-500/20 border border-purple-400/30 text-purple-300"
                                                            )}>
                                                                {idx + 1}
                                                            </span>
                                                            <Input
                                                                placeholder="Kavram Adı (Örn: Tevhid, İhlas, Sıdk)..."
                                                                value={item.concept}
                                                                onChange={(e) => handleDefinitionChange(idx, 'concept', e.target.value)}
                                                                className={cn(
                                                                    "text-xs font-bold rounded-xl h-9 max-w-md",
                                                                    isDefEmpty
                                                                        ? "bg-slate-950/80 border-amber-500/50 text-amber-200 focus:border-amber-400"
                                                                        : "bg-slate-950/70 border-white/10 text-purple-300 focus:border-purple-400"
                                                                )}
                                                            />
                                                            {isDefEmpty && (
                                                                <span className="text-[10px] font-black bg-amber-500/30 border border-amber-400 text-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse flex-shrink-0">
                                                                    <AlertCircle className="w-3 h-3 text-amber-400" /> TANIM GİRİLMEMİŞ!
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveDefinition(idx)}
                                                            className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl cursor-pointer"
                                                            title="Kartı Sil"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                    <Textarea
                                                        placeholder={isDefEmpty
                                                            ? "⚠️ Bu kavramın tanımı henüz yazılmamış! Lütfen bir tanım girin..."
                                                            : "Kavramın açıklaması ve tanımı..."
                                                        }
                                                        value={item.definition}
                                                        onChange={(e) => handleDefinitionChange(idx, 'definition', e.target.value)}
                                                        rows={2}
                                                        className={cn(
                                                            "text-xs rounded-xl leading-relaxed",
                                                            isDefEmpty
                                                                ? "bg-slate-950/80 border-amber-500/60 text-white placeholder:text-amber-400/70 focus:border-amber-400"
                                                                : "bg-slate-950/50 border-white/10 text-slate-200 focus:border-purple-400"
                                                        )}
                                                    />
                                                </div>
                                            );
                                        })}
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
                                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Tanımları Üret
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 2. KAVRAMLAR (KELİME HAVUZU) SEKMESİ ── */}
                        {activeTab === 'concepts' && (
                            <div className="space-y-4 max-w-5xl mx-auto">
                                <div className="bg-slate-950/60 p-4 rounded-2xl border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-blue-400" />
                                            <span>Kelime & Kavram Havuzu (Tek Kelimelik Terimler)</span>
                                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px]">
                                                {editingConcepts.length} Kelime
                                            </Badge>
                                            {missingDefinitionConcepts.length > 0 ? (
                                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">
                                                    ⚠️ {missingDefinitionConcepts.length} Tanım Eksik
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold">
                                                    ✓ Tümü Tanımlı
                                                </Badge>
                                            )}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Anlat Bakalım, Anagram Duvarı, Çarkıfelek ve Kelime Avı oyunlarında anahtar terim olarak kullanılır.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {missingDefinitionConcepts.length > 0 && (
                                            <Button
                                                onClick={handleGenerateAiForMissingDefinitions}
                                                disabled={isGeneratingAi || !activeTopic}
                                                size="sm"
                                                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-950/50 cursor-pointer"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> Tanımsızları AI İle Tanımla ({missingDefinitionConcepts.length})
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleGenerateAi('concepts')}
                                            disabled={isGeneratingAi || !activeTopic}
                                            variant="outline"
                                            size="sm"
                                            className="border-blue-500/30 text-blue-300 hover:bg-blue-950/50 hover:text-white rounded-xl text-xs cursor-pointer"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Kelimeleri Çıkar
                                        </Button>
                                    </div>
                                </div>

                                {/* Hızlı Ekleme Çubuğu */}
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Yeni kavram veya virgülle birden fazla ekleyin (Örn: Tevhid, İhlas, Sadaka)..."
                                        value={newConceptInput}
                                        onChange={(e) => setNewConceptInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddMultipleConcepts(newConceptInput);
                                            }
                                        }}
                                        className="bg-slate-950/70 border-white/10 text-xs rounded-xl focus:border-blue-500 text-white placeholder:text-slate-500 flex-1"
                                    />
                                    <Button
                                        onClick={() => handleAddMultipleConcepts(newConceptInput)}
                                        disabled={!newConceptInput.trim()}
                                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl px-4 cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Ekle
                                    </Button>
                                </div>

                                {/* Kelime Etiketleri */}
                                {editingConcepts.length > 0 ? (
                                    <div className="flex flex-wrap gap-2.5 p-4 bg-slate-950/40 rounded-2xl border border-white/5 min-h-[140px]">
                                        {editingConcepts.map((concept, idx) => {
                                            const hasDefinition = definedConceptsMap.has(normalizeConcept(concept));
                                            return (
                                                <div
                                                    key={idx}
                                                    className={cn(
                                                        "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium group transition-all border",
                                                        hasDefinition
                                                            ? "bg-blue-950/40 border-blue-500/30 text-blue-200 hover:border-blue-400"
                                                            : "bg-amber-950/50 border-amber-500/70 text-amber-200 ring-1 ring-amber-500/40"
                                                    )}
                                                >
                                                    <span className="font-bold">{concept}</span>

                                                    {hasDefinition ? (
                                                        <span className="text-[9px] bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono">
                                                            <Check className="w-3 h-3 text-emerald-400" /> Tanımlı
                                                        </span>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[9px] bg-amber-500/30 border border-amber-400/50 text-amber-300 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                                                                <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" /> Tanımsız
                                                            </span>
                                                            <button
                                                                onClick={() => handleQuickAddDefinitionForConcept(concept)}
                                                                className="text-[10px] font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                                            >
                                                                + Tanım Yaz
                                                            </button>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => handleRemoveConcept(idx)}
                                                        className="text-slate-500 hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                                                        title="Kavramı Kaldır"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
                                        <Tag className="w-10 h-10 text-blue-400 mx-auto opacity-40" />
                                        <div className="space-y-1">
                                            <h4 className="text-base font-bold text-white">Henüz Kelime/Kavram Eklenmedi</h4>
                                            <p className="text-xs text-slate-400 max-w-md">
                                                Anlat Bakalım ve Anagram oyunlarında kullanılacak kelimeleri yukarıdan yazabilir veya yapay zeka ile otomatik çıkarabilirsiniz.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleGenerateAi('concepts')}
                                            disabled={isGeneratingAi}
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Kelimeleri Çıkar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 3. DEFTERE YAZILACAK ÖZET NOTLAR SEKMESİ ── */}
                        {activeTab === 'notes' && (
                            <div className="space-y-4 max-w-5xl mx-auto">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950/70 p-4 rounded-2xl border border-indigo-500/30 gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-indigo-400" />
                                            <span>Deftere Yazılacak Özet Notlar (Akıllı Tahta Sunumu)</span>
                                            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[10px]">
                                                {editingNotes.length} Not Maddesi
                                            </Badge>
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Öğrencilerin derste akıllı tahtadan defterlerine geçireceği kazanım özet maddeleridir.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Button
                                            onClick={() => handleGenerateAi('notes')}
                                            disabled={isGeneratingAi || !activeTopic}
                                            variant="outline"
                                            size="sm"
                                            className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/50 hover:text-white rounded-xl text-xs cursor-pointer"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Notları Üret
                                        </Button>
                                        <Button
                                            onClick={handleAddNote}
                                            size="sm"
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Yeni Not Ekle
                                        </Button>
                                    </div>
                                </div>

                                {/* Notlar Listesi */}
                                {editingNotes.length > 0 ? (
                                    <div className="space-y-3">
                                        {editingNotes.map((note, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-slate-900/90 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-3.5 transition-all flex items-start gap-3 group"
                                            >
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md mt-1">
                                                    {idx + 1}
                                                </div>
                                                <Textarea
                                                    placeholder={`Deftere yazılacak ders notu maddesi ${idx + 1}...`}
                                                    value={note}
                                                    onChange={(e) => handleNoteChange(idx, e.target.value)}
                                                    rows={2}
                                                    className="bg-slate-950/60 border-white/10 text-xs font-medium text-slate-200 focus:border-indigo-400 rounded-xl leading-relaxed flex-1"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveNote(idx)}
                                                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl flex-shrink-0 mt-1 cursor-pointer"
                                                    title="Notu Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
                                        <FileText className="w-10 h-10 text-indigo-400 mx-auto opacity-40" />
                                        <div className="space-y-1">
                                            <h4 className="text-base font-bold text-white">Henüz Defter Notu Eklenmedi</h4>
                                            <p className="text-xs text-slate-400 max-w-md">
                                                Öğrencilerin akıllı tahtadan defterlerine yazacakları özet notları yapay zeka ile tek tıkla oluşturabilirsiniz.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleGenerateAi('notes')}
                                            disabled={isGeneratingAi}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Defter Notlarını Üret
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 4. KISA ETKİNLİK CÜMLELERİ (OYUN HAVUZU) SEKMESİ ── */}
                        {activeTab === 'activitySentences' && (
                            <div className="space-y-4 max-w-5xl mx-auto">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950/70 p-4 rounded-2xl border border-emerald-500/30 gap-3">
                                    <div>
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <ListOrdered className="w-4 h-4 text-emerald-400" />
                                            <span>Kısa Etkinlik Cümleleri (Oyun Motoru Havuzu)</span>
                                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px]">
                                                {editingActivitySentences.length} Oyun Cümlesi
                                            </Badge>
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Cümle Kurma, Doğru-Yanlış Zinciri ve Tornado oyunlarında kullanılır.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {editingNotes.length > 0 && (
                                            <Button
                                                onClick={handleTransferNotesToActivitySentences}
                                                variant="outline"
                                                size="sm"
                                                className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl text-xs cursor-pointer"
                                                title="Defter notlarındaki maddeleri buraya kopyala"
                                            >
                                                <Copy className="w-3.5 h-3.5 mr-1" /> Notlardan Aktar
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleGenerateAi('activitySentences')}
                                            disabled={isGeneratingAi || !activeTopic}
                                            variant="outline"
                                            size="sm"
                                            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/50 hover:text-white rounded-xl text-xs cursor-pointer"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Kısa Cümle Üret
                                        </Button>
                                        <Button
                                            onClick={handleAddActivitySentence}
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Yeni Cümle Ekle
                                        </Button>
                                    </div>
                                </div>

                                {/* Oyun Cümleleri Listesi */}
                                {editingActivitySentences.length > 0 ? (
                                    <div className="space-y-3">
                                        {editingActivitySentences.map((sentence, idx) => {
                                            const wordCount = sentence.trim().split(/\s+/).filter(Boolean).length;
                                            const isIdealLength = wordCount >= 4 && wordCount <= 9;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="bg-slate-900/90 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-3.5 transition-all flex items-start gap-3 group"
                                                >
                                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md mt-1">
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1 space-y-1.5">
                                                        <Textarea
                                                            placeholder={`Kısa etkinlik cümlesi ${idx + 1} (4-8 kelime)...`}
                                                            value={sentence}
                                                            onChange={(e) => handleActivitySentenceChange(idx, e.target.value)}
                                                            rows={2}
                                                            className="bg-slate-950/60 border-white/10 text-xs font-medium text-slate-200 focus:border-emerald-400 rounded-xl leading-relaxed"
                                                        />
                                                        {sentence.trim() && (
                                                            <span className={cn(
                                                                "text-[10px] font-mono px-2 py-0.5 rounded-full border inline-block",
                                                                isIdealLength
                                                                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                                                                    : "bg-slate-950 border-white/10 text-slate-400"
                                                            )}>
                                                                {wordCount} kelime {isIdealLength ? "• İdeal Oyun Boyutu ✓" : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveActivitySentence(idx)}
                                                        className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl flex-shrink-0 mt-1 cursor-pointer"
                                                        title="Cümleyi Sil"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 rounded-3xl border border-dashed border-white/10 text-center space-y-4">
                                        <ListOrdered className="w-10 h-10 text-emerald-400 mx-auto opacity-40" />
                                        <div className="space-y-1">
                                            <h4 className="text-base font-bold text-white">Henüz Kısa Oyun Cümlesi Eklenmedi</h4>
                                            <p className="text-xs text-slate-400 max-w-md">
                                                Cümle Kurma ve Doğru-Yanlış oyunları için 4-8 kelimelik kısa cümleleri yapay zeka ile otomatik üretebilirsiniz.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => handleGenerateAi('activitySentences')}
                                            disabled={isGeneratingAi}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Kısa Oyun Cümlelerini Üret
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── 5. AKILLI TAHTA CANLI ÖNİZLEME SEKMESİ ── */}
                        {activeTab === 'smartboard' && (
                            <div className="space-y-4 max-w-5xl mx-auto">
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-white/10">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPreviewSubTab('kavramlar')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                                previewSubTab === 'kavramlar'
                                                    ? "bg-purple-600 text-white shadow"
                                                    : "text-slate-400 hover:text-white"
                                            )}
                                        >
                                            KAVRAMLAR ({editingDefinitions.length})
                                        </button>
                                        <button
                                            onClick={() => setPreviewSubTab('notlar')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                                previewSubTab === 'notlar'
                                                    ? "bg-indigo-600 text-white shadow"
                                                    : "text-slate-400 hover:text-white"
                                            )}
                                        >
                                            NOTLAR ({editingNotes.length})
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-white/10 text-xs">
                                            <span className="text-slate-400 text-[11px]">Yazı Boyutu:</span>
                                            <button
                                                onClick={() => setFontSize(f => Math.max(0.9, f - 0.1))}
                                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-center cursor-pointer"
                                            >
                                                -
                                            </button>
                                            <span className="font-mono text-cyan-300 w-8 text-center">{fontSize.toFixed(1)}x</span>
                                            <button
                                                onClick={() => setFontSize(f => Math.min(2.2, f + 0.1))}
                                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-center cursor-pointer"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <Button
                                            asChild
                                            size="sm"
                                            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                        >
                                            <Link href={smartboardPlayUrl} target="_blank">
                                                <Maximize className="w-3.5 h-3.5 mr-1" /> Tahtada Başlat
                                            </Link>
                                        </Button>
                                    </div>
                                </div>

                                <div
                                    ref={previewContainerRef}
                                    className="bg-slate-950 rounded-3xl border-4 border-slate-800 p-6 sm:p-8 min-h-[480px] shadow-2xl relative overflow-hidden"
                                >
                                    <div className="text-center pb-6 border-b border-white/10 mb-6">
                                        <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">
                                            {activeTopic ? activeTopic.unitTitle : ''}
                                        </span>
                                        <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                                            {activeTopic ? activeTopic.title : 'Konu Başlığı'}
                                        </h2>
                                    </div>

                                    {previewSubTab === 'kavramlar' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {editingDefinitions.length > 0 ? (
                                                editingDefinitions.map((cd, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{ fontSize: `${fontSize}rem` }}
                                                        className={cn(
                                                            "p-5 rounded-2xl border transition-all duration-300 backdrop-blur-md flex flex-col justify-between gap-3 shadow-lg",
                                                            COLOR_CLASSES[idx % COLOR_CLASSES.length]
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                            <h3 className="font-black tracking-wide text-white uppercase" style={{ fontSize: `${fontSize * 1.15}rem` }}>
                                                                {cd.concept || 'Kavram Adı'}
                                                            </h3>
                                                            <span className="text-xs font-mono opacity-60">#{idx + 1}</span>
                                                        </div>
                                                        <p className="font-semibold leading-relaxed text-slate-100 opacity-95">
                                                            {cd.definition || 'Kavram tanımı henüz girilmedi...'}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-2 text-center py-16 text-slate-500 font-medium">
                                                    Bu konu için henüz kavram-tanım eklenmedi.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {previewSubTab === 'notlar' && (
                                        <div className="space-y-4">
                                            {editingNotes.length > 0 ? (
                                                editingNotes.map((note, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{ fontSize: `${fontSize}rem` }}
                                                        className={cn(
                                                            "p-4 rounded-2xl border transition-all duration-300 backdrop-blur-md flex items-start gap-4 shadow-lg",
                                                            COLOR_CLASSES[idx % COLOR_CLASSES.length]
                                                        )}
                                                    >
                                                        <span className="w-8 h-8 rounded-xl bg-black/40 border border-white/20 flex items-center justify-center font-black text-sm text-white flex-shrink-0 mt-0.5">
                                                            {idx + 1}
                                                        </span>
                                                        <p className="font-bold leading-relaxed text-slate-100 flex-1">
                                                            {note}
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-16 text-slate-500 font-medium">
                                                    Bu konu için henüz deftere yazılacak özet not girilmedi.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── 6. DERS KİTABI METNİ SEKMESİ ── */}
                        {activeTab === 'source' && (
                            <div className="space-y-4 max-w-4xl mx-auto">
                                <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-emerald-400" />
                                            <span>MEB Ders Kitabı Kaynak Metni</span>
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Yapay zekanın analiz ettiği ve kavramları çıkardığı orijinal ders kitabı metni.
                                        </p>
                                    </div>
                                    {activeTopic?.sourceText && (
                                        <Badge className="bg-emerald-950 border-emerald-500 text-emerald-300 font-mono text-[11px]">
                                            {activeTopic.sourceText.trim().split(/\s+/).length} Kelime
                                        </Badge>
                                    )}
                                </div>

                                {activeTopic?.sourceText ? (
                                    <div className="bg-slate-950/80 p-6 rounded-3xl border border-white/10 text-slate-300 font-serif leading-loose text-sm sm:text-base whitespace-pre-wrap selection:bg-purple-600 selection:text-white">
                                        {activeTopic.sourceText}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-12 bg-slate-950/40 rounded-3xl border border-dashed border-white/10 text-center space-y-3">
                                        <BookMarked className="w-10 h-10 text-slate-600 mx-auto" />
                                        <h4 className="text-base font-bold text-slate-300">Kaynak Metin Bulunamadı</h4>
                                        <p className="text-xs text-slate-500 max-w-md">
                                            Bu konuya ait ders kitabı metni henüz sisteme kaydedilmemiş. Konu başlığı üzerinden de AI üretimi yapabilirsiniz.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </DialogContent>
            </Dialog>

            {/* AI Stüdyosu Modalı (Sunum Stüdyosu Tasarımı) */}
            {activeTopic && (
                <AiActivityStudioDialog
                    isOpen={isAiDialogOpen}
                    onOpenChange={setIsAiDialogOpen}
                    topicTitle={activeTopic.title}
                    sourceText={activeTopic.sourceText || ''}
                    grade={activeTopic.grade}
                    courseTitle={activeTopic.courseTitle}
                    missingConcepts={missingDefinitionConcepts}
                    onGenerated={handleAiDataGenerated}
                />
            )}

        </div>
    );
}

function StudioLoadingScreen() {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                <p className="text-slate-400 font-bold text-lg">Kavram & Notlar Stüdyosu Yükleniyor...</p>
            </div>
        </div>
    );
}

export default function CentralActivityStudioPage() {
    return (
        <Suspense fallback={<StudioLoadingScreen />}>
            <CentralActivityStudioContent />
        </Suspense>
    );
}
