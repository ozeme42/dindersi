'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Columns, BookOpen, Search, Sparkles, Check, ChevronLeft, ChevronRight,
    Loader2, Save, Wand2, ArrowLeft, Download, Plus, Trash2, Maximize,
    Minimize, ExternalLink, RefreshCw, Layers, BookMarked, Eye, LayoutTemplate,
    ListOrdered, FileText, PanelLeftClose, PanelLeftOpen, CheckCircle2, AlertCircle,
    Tag, HelpCircle, AlignLeft, X, Copy, Zap, Info, AlertTriangle, Home
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
import { normalizeConcept } from '@/lib/concept-utils';

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

    // Studio Tabs: 'concepts' | 'definitions' | 'notes' | 'activitySentences' | 'smartboard' | 'source'
    const [activeTab, setActiveTab] = useState<'concepts' | 'definitions' | 'notes' | 'activitySentences' | 'smartboard' | 'source'>('definitions');

    // ── EDITING STATES FOR ALL 4 TYPES (AYRIŞTIRILMIŞ) ──
    // 1. Single Words / Concepts (Kelime Havuzu)
    const [editingConcepts, setEditingConcepts] = useState<string[]>([]);
    const [newConceptInput, setNewConceptInput] = useState<string>('');

    // 2. Concept - Definition Pairs (Kavram-Tanım Eşleşmeli)
    const [editingDefinitions, setEditingDefinitions] = useState<ConceptItem[]>([]);

    // 3. Deftere Yazılacak Özet Notlar (Akıllı Tahta Notları)
    const [editingNotes, setEditingNotes] = useState<string[]>([]);

    // 4. Kısa Etkinlik Cümleleri (Oyun Havuzu: Cümle Kurma, D/Y, Tornado)
    const [editingActivitySentences, setEditingActivitySentences] = useState<string[]>([]);

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

    // Parse URL query parameters on initial load
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const courseParam = params.get('courseId') || params.get('course');
        const unitParam = params.get('unitId') || params.get('unit');
        const topicParam = params.get('topicId') || params.get('topic');
        const tabParam = params.get('tab');

        if (['concepts', 'definitions', 'notes', 'activitySentences', 'smartboard', 'source'].includes(tabParam || '')) {
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
        return Array.from(map.values());
    }, [items, selectedGrade]);

    // Ensure selectedCourseId is valid
    useEffect(() => {
        if (coursesInGrade.length > 0 && !coursesInGrade.some(c => c.id === selectedCourseId)) {
            setSelectedCourseId(coursesInGrade[0].id);
        }
    }, [coursesInGrade, selectedCourseId]);

    // Units in current course
    const unitsInCourse = useMemo(() => {
        const map = new Map<string, { id: string; title: string; count: number }>();
        items.filter(i => i.grade === selectedGrade && i.courseId === selectedCourseId).forEach(item => {
            const existing = map.get(item.unitId);
            if (existing) {
                existing.count++;
            } else {
                map.set(item.unitId, { id: item.unitId, title: item.unitTitle, count: 1 });
            }
        });
        return Array.from(map.values());
    }, [items, selectedGrade, selectedCourseId]);

    // Ensure selectedUnitId is valid
    useEffect(() => {
        if (unitsInCourse.length > 0 && !unitsInCourse.some(u => u.id === selectedUnitId)) {
            setSelectedUnitId(unitsInCourse[0].id);
        }
    }, [unitsInCourse, selectedUnitId]);

    // Topics in current unit
    const topicsInUnit = useMemo(() => {
        return items.filter(i => i.grade === selectedGrade && i.courseId === selectedCourseId && i.unitId === selectedUnitId);
    }, [items, selectedGrade, selectedCourseId, selectedUnitId]);

    // Ensure selectedTopicId is valid
    useEffect(() => {
        if (topicsInUnit.length > 0 && !topicsInUnit.some(t => t.topicId === selectedTopicId)) {
            setSelectedTopicId(topicsInUnit[0].topicId);
        }
    }, [topicsInUnit, selectedTopicId]);

    // Currently Active Topic
    const activeTopic = useMemo(() => {
        return items.find(i => i.topicId === selectedTopicId) || null;
    }, [items, selectedTopicId]);

    // Navigation previous and next topics
    const { prevTopic, nextTopic } = useMemo(() => {
        if (!activeTopic) return { prevTopic: null, nextTopic: null };
        const idx = topicsInUnit.findIndex(t => t.topicId === activeTopic.topicId);
        return {
            prevTopic: idx > 0 ? topicsInUnit[idx - 1] : null,
            nextTopic: idx >= 0 && idx < topicsInUnit.length - 1 ? topicsInUnit[idx + 1] : null
        };
    }, [activeTopic, topicsInUnit]);

    // Sync editing state whenever activeTopic changes
    useEffect(() => {
        if (activeTopic) {
            setEditingConcepts(activeTopic.concepts || []);
            setEditingDefinitions(activeTopic.conceptDefinitions || []);
            setEditingNotes(activeTopic.notes || []);
            setEditingActivitySentences(activeTopic.activitySentences || (activeTopic as any).sentences || []);
            setHasUnsavedChanges(false);
        }
    }, [activeTopic]);

    // ── KAVRAM - TANIM EŞLEŞTİRME & EKSİK TANIM HESAPLAMALARI ──
    // Dolu ve geçerli tanımı olan kavramların haritası (NFD normalizasyonu ile Semî' / Semi eşleştirilir)
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

    // Kelime havuzunda (editingConcepts) olup henüz geçerli tanımı yazılmamış olan kavramlar
    // normalizeConcept ile deduplicate edilir, Semî' ve Semi tek kavram sayılır
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

    // Tanımlı kavram adedi (Tekil kavramlar üzerinden)
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

    // Tanım kartları arasında tanım metni henüz boş olan kartlar
    const emptyDefinitionCardCount = useMemo(() => {
        return editingDefinitions.filter(d => !d.definition || !d.definition.trim()).length;
    }, [editingDefinitions]);

    // Search filtering across all topics
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLocaleLowerCase('tr').trim();
        const normQ = normalizeConcept(searchQuery);
        return items.filter(i =>
            i.title.toLocaleLowerCase('tr').includes(q) ||
            i.courseTitle.toLocaleLowerCase('tr').includes(q) ||
            i.unitTitle.toLocaleLowerCase('tr').includes(q) ||
            i.concepts.some(c => c.toLocaleLowerCase('tr').includes(q) || (normQ && normalizeConcept(c).includes(normQ))) ||
            i.conceptDefinitions.some(cd => cd.concept.toLocaleLowerCase('tr').includes(q) || (normQ && normalizeConcept(cd.concept).includes(normQ)) || cd.definition.toLocaleLowerCase('tr').includes(q)) ||
            i.notes.some(n => n.toLocaleLowerCase('tr').includes(q)) ||
            i.activitySentences.some(s => s.toLocaleLowerCase('tr').includes(q))
        );
    }, [items, searchQuery]);

    // Handling topic selection (Automatically collapses sidebar on topic select for clean workspace)
    const handleTopicSelect = (topicId: string, autoCollapse = true) => {
        const found = items.find(i => i.topicId === topicId);
        if (found) {
            setSelectedGrade(found.grade);
            setSelectedCourseId(found.courseId);
            setSelectedUnitId(found.unitId);
            setSelectedTopicId(found.topicId);
            if (autoCollapse) {
                setIsSidebarOpen(false);
            }
        }
    };

    const handleSelectSearchResult = (topicItem: YazilacaklarTopicItem) => {
        setSelectedGrade(topicItem.grade);
        setSelectedCourseId(topicItem.courseId);
        setSelectedUnitId(topicItem.unitId);
        setSelectedTopicId(topicItem.topicId);
        setSearchQuery('');
        setIsSidebarOpen(false);
    };

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

    // Tanımı olmayan kavrama tek tıkla tanım kartı açıp 2. sekmeye geçiş
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

    // Tüm tanımsız kavramlar için topluca kart açma
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

    // Yalnızca tanımsız kavramlar için AI ile tanım üretme
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

                    // Yeni tanımları ekle/güncelle
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

                    // Listeyi yeniden oluştur: önce mevcut kartlar, sonra yeniler
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

    // Defter notlarından oyun cümleleri çıkarma yardımcısı
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

    // ── MERKEZİ KAYDETME & SENKRONİZASYON (4 VERİ TİPİ AYRI) ──
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

    // ── YAPAY ZEKA ÜRETİMİ (HER SEKME İÇİN AYRI VEYA HEPSİ) ──
    const handleGenerateAi = async (mode: 'all' | 'concepts' | 'definitions' | 'notes' | 'activitySentences' = 'all') => {
        if (!activeTopic) return;
        setIsGeneratingAi(true);
        setAiDropdownOpen(false);

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
                
                {/* ══ BREADCRUMB & GERİ DÖN NAVİGASYON BARI ══ */}
                <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 flex-wrap">
                        <Link 
                            href="/teacher" 
                            className="hover:text-purple-300 transition-colors flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-slate-900/60 border border-white/5 hover:border-purple-500/30"
                            title="Öğretmen Ana Paneli"
                        >
                            <Home className="w-3.5 h-3.5 text-purple-400" />
                            <span>Öğretmen Paneli</span>
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        <Link 
                            href="/teacher/smartboard" 
                            className="hover:text-purple-300 transition-colors py-1 px-2.5 rounded-lg bg-slate-900/60 border border-white/5 hover:border-purple-500/30"
                            title="Akıllı Tahta Hub"
                        >
                            Akıllı Tahta
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-slate-200 font-bold py-1 px-2">Merkezi Etkinlik Stüdyosu</span>
                        {activeTopic && (
                            <>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                                <span className="text-purple-300 font-bold bg-purple-950/50 border border-purple-500/30 px-2 py-0.5 rounded-md text-[11px] truncate max-w-xs">
                                    {activeTopic.className} • {activeTopic.title}
                                </span>
                            </>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (typeof window !== 'undefined' && window.history.length > 1) {
                                router.back();
                            } else {
                                router.push('/teacher/smartboard');
                            }
                        }}
                        className="h-8 px-3 rounded-xl bg-slate-900/80 border-white/15 hover:bg-purple-950/40 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all shadow hover:border-purple-500/40 group cursor-pointer"
                        title="Önceki Sayfaya Geri Dön"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-purple-400 group-hover:text-purple-300" />
                        <span>Geri Dön</span>
                    </Button>
                </div>

                {/* ══ ÜST HEADER: BAŞLIK, ARAMA, EYLEMLER ══ */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-900/80 border border-white/10 rounded-3xl p-4 md:p-5 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center gap-3.5">
                        {/* Geri Dön Butonu */}
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (typeof window !== 'undefined' && window.history.length > 1) {
                                    router.back();
                                } else {
                                    router.push('/teacher/smartboard');
                                }
                            }}
                            className="h-12 px-3.5 rounded-2xl bg-slate-950/90 border-white/15 hover:bg-purple-950/40 hover:border-purple-500/60 text-slate-300 hover:text-white flex items-center gap-2 transition-all shadow-lg group flex-shrink-0 cursor-pointer"
                            title="Önceki Sayfaya Geri Dön"
                        >
                            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1 text-purple-400 group-hover:text-purple-300" />
                            <span className="text-xs font-bold hidden sm:inline">Geri</span>
                        </Button>

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
                                Kelimeleri, tanımları, defter notlarını ve oyun cümlelerini tek ekrandan yönetin; oyunlara anında yansısın.
                            </p>
                        </div>
                    </div>

                    {/* Arama Çubuğu & Butonlar */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Global Arama */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                                placeholder="Kavram, tanım, not ara..."
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
                                                {res.notesCount > 0 && (
                                                    <span className="text-[9px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                                                        {res.notesCount} Ö.
                                                    </span>
                                                )}
                                                {res.activitySentencesCount > 0 && (
                                                    <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                                                        {res.activitySentencesCount} E.
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Akıllı Tahta Aç Butonu */}
                        <Button
                            asChild
                            variant="outline"
                            className="border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-950/50 bg-slate-950/70 rounded-xl h-10 px-3.5 text-xs font-bold"
                            disabled={!activeTopic}
                        >
                            <Link href={smartboardPlayUrl} target="_blank">
                                <ExternalLink className="w-4 h-4 mr-1.5 text-cyan-400" />
                                <span>Akıllı Tahtada Aç</span>
                            </Link>
                        </Button>

                        {/* PDF Yazdır */}
                        <Button
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf || !activeTopic}
                            variant="outline"
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-slate-950/70 rounded-xl h-10 px-3 text-xs"
                            title="Yazdır veya PDF olarak kaydet"
                        >
                            <Download className="w-4 h-4 mr-1 text-slate-400" />
                            <span>PDF</span>
                        </Button>

                        {/* AI İle Üret Dropdown */}
                        <div className="relative">
                            <Button
                                onClick={() => setAiDropdownOpen(v => !v)}
                                disabled={isGeneratingAi || !activeTopic}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl h-10 px-3.5 text-xs font-bold shadow-lg shadow-purple-900/30 flex items-center gap-1.5"
                            >
                                {isGeneratingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                                <span>AI İle Üret</span>
                            </Button>

                            {aiDropdownOpen && (
                                <div className="absolute right-0 top-12 bg-slate-900 border border-white/20 rounded-2xl p-2 shadow-2xl z-50 w-72 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                                    <button
                                        onClick={() => handleGenerateAi('all')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-white hover:bg-purple-600/30 flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                        <span>Tamamı (Kavram, Tanım, Not, Cümle)</span>
                                    </button>
                                    <button
                                        onClick={() => handleGenerateAi('concepts')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-blue-300 hover:bg-blue-600/30 flex items-center gap-2"
                                    >
                                        <Tag className="w-4 h-4 text-blue-400" />
                                        <span>Yalnızca Kelime / Kavram Havuzunu Üret</span>
                                    </button>
                                    <button
                                        onClick={() => handleGenerateAi('definitions')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-purple-300 hover:bg-purple-600/30 flex items-center gap-2"
                                    >
                                        <Columns className="w-4 h-4 text-purple-400" />
                                        <span>Yalnızca Kavram-Tanım Çiftlerini Üret</span>
                                    </button>
                                    {missingDefinitionConcepts.length > 0 && (
                                        <button
                                            onClick={handleGenerateAiForMissingDefinitions}
                                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-600/30 flex items-center gap-2 border-t border-white/10"
                                        >
                                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                                            <span>Yalnızca Tanımı Eksikleri Doldur ({missingDefinitionConcepts.length})</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleGenerateAi('notes')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-indigo-300 hover:bg-indigo-600/30 flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4 text-indigo-400" />
                                        <span>Yalnızca Deftere Yazılacak Notları Üret</span>
                                    </button>
                                    <button
                                        onClick={() => handleGenerateAi('activitySentences')}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 flex items-center gap-2"
                                    >
                                        <ListOrdered className="w-4 h-4 text-emerald-400" />
                                        <span>Yalnızca Kısa Oyun Cümlelerini Üret</span>
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
                                        size="icon"
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="h-8 w-8 text-slate-400 hover:text-white rounded-xl"
                                        title="Fihristi Gizle"
                                    >
                                        <PanelLeftClose className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Miller Columns Gövdesi */}
                            <div className="flex-1 grid grid-cols-12 divide-x divide-white/10 overflow-hidden bg-slate-950/40">
                                
                                {/* 1. KADEME: SINIFLAR (2 Sütun) */}
                                <div className="col-span-2 flex flex-col overflow-y-auto p-2 space-y-1.5">
                                    <div className="px-2 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sınıf</div>
                                    {availableGrades.map(grade => {
                                        const count = items.filter(i => i.grade === grade).length;
                                        const isSelected = selectedGrade === grade;
                                        return (
                                            <button
                                                key={grade}
                                                onClick={() => {
                                                    setSelectedGrade(grade);
                                                    setFocusedColumn('course');
                                                }}
                                                className={cn(
                                                    "w-full text-left p-2.5 rounded-2xl transition-all flex flex-col items-center justify-center gap-0.5 border text-xs font-bold",
                                                    isSelected
                                                        ? "bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-950"
                                                        : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <span className="text-sm font-black">{grade}.</span>
                                                <span className="text-[10px] opacity-75 font-normal">Sınıf</span>
                                                <span className="text-[9px] font-mono mt-1 opacity-60">({count})</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* 2. KADEME: DERSLER (3 Sütun) */}
                                <div className="col-span-3 flex flex-col overflow-y-auto p-2 space-y-1.5">
                                    <div className="px-2 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ders</div>
                                    {coursesInGrade.map(course => {
                                        const isSelected = selectedCourseId === course.id;
                                        return (
                                            <button
                                                key={course.id}
                                                onClick={() => {
                                                    setSelectedCourseId(course.id);
                                                    setFocusedColumn('unit');
                                                }}
                                                className={cn(
                                                    "w-full text-left p-2.5 rounded-2xl transition-all border text-xs font-bold leading-tight group",
                                                    isSelected
                                                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-950"
                                                        : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <div className="line-clamp-2">{course.title}</div>
                                                <div className="text-[10px] opacity-60 font-mono mt-1">
                                                    {course.count} Konu
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* 3. KADEME: ÜNİTELER (3 Sütun) */}
                                <div className="col-span-3 flex flex-col overflow-y-auto p-2 space-y-1.5">
                                    <div className="px-2 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ünite</div>
                                    {unitsInCourse.map((unit, idx) => {
                                        const isSelected = selectedUnitId === unit.id;
                                        return (
                                            <button
                                                key={unit.id}
                                                onClick={() => {
                                                    setSelectedUnitId(unit.id);
                                                    setFocusedColumn('topic');
                                                }}
                                                className={cn(
                                                    "w-full text-left p-2.5 rounded-2xl transition-all border text-xs font-medium leading-tight group",
                                                    isSelected
                                                        ? "bg-cyan-600 border-cyan-400 text-white shadow-md shadow-cyan-950 font-bold"
                                                        : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                                                )}
                                            >
                                                <div className="text-[10px] font-mono opacity-60 mb-0.5">Ünite {idx + 1}</div>
                                                <div className="line-clamp-2 text-xs">{unit.title}</div>
                                                <div className="text-[10px] opacity-60 font-mono mt-1">
                                                    {unit.count} Konu
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* 4. KADEME: KONULAR (4 Sütun - Tıklanınca Otomatik Gizlenir) */}
                                <div className="col-span-4 flex flex-col overflow-y-auto p-2 space-y-1.5">
                                    <div className="px-2 py-1 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                                        <span>Konular ({topicsInUnit.length})</span>
                                        <span className="text-[9px] text-purple-400 font-normal">Seç ve Odaklan</span>
                                    </div>
                                    {topicsInUnit.map((topic, idx) => {
                                        const isSelected = selectedTopicId === topic.topicId;
                                        const hasMissingDef = topic.conceptsCount > 0 && topic.definitionsCount < topic.conceptsCount;
                                        return (
                                            <button
                                                key={topic.topicId}
                                                onClick={() => handleTopicSelect(topic.topicId, true)}
                                                className={cn(
                                                    "w-full text-left p-2.5 rounded-2xl transition-all border text-xs leading-snug group flex flex-col gap-1.5",
                                                    isSelected
                                                        ? "bg-purple-600 border-purple-400 text-white font-bold shadow-lg shadow-purple-950"
                                                        : "border-white/5 bg-slate-900/50 text-slate-200 hover:bg-white/10 hover:border-white/10"
                                                )}
                                            >
                                                <div className="flex items-start justify-between gap-1">
                                                    <span className="text-[10px] font-mono opacity-60">#{idx + 1}</span>
                                                    {topic.hasContent ? (
                                                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1" title="İçerik mevcut" />
                                                    ) : (
                                                        <span className="w-2 h-2 rounded-full bg-slate-600 flex-shrink-0 mt-1" title="Boş" />
                                                    )}
                                                </div>
                                                <div className="line-clamp-2 text-xs font-semibold">{topic.title}</div>

                                                {/* Rozetler: K (Kavram), T (Tanım), Ö (Özet Not), E (Etkinlik Cümlesi) */}
                                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/80 text-blue-300 font-mono" title="Kavramlar">
                                                        K: {topic.conceptsCount}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            "text-[9px] px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5",
                                                            hasMissingDef
                                                                ? "bg-amber-950/80 border border-amber-600/80 text-amber-300 font-bold"
                                                                : "bg-purple-950/80 border border-purple-800/80 text-purple-300"
                                                        )}
                                                        title={hasMissingDef ? `${topic.conceptsCount - topic.definitionsCount} kavramın tanımı eksik!` : "Tanımlar"}
                                                    >
                                                        T: {topic.definitionsCount} {hasMissingDef && "⚠️"}
                                                    </span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 font-mono" title="Defter Notları (Özet)">
                                                        Ö: {topic.notesCount}
                                                    </span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono" title="Kısa Etkinlik Cümleleri">
                                                        E: {topic.activitySentencesCount}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── SAĞ PANEL: ÇALIŞMA MASASI & STÜDYO EDİTÖRÜ (SEKMELİ) ── */}
                    <div className={cn(
                        "flex flex-col rounded-3xl bg-slate-900/80 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl transition-all duration-300",
                        isSidebarOpen ? "xl:col-span-7 2xl:col-span-7 min-h-[820px] xl:min-h-[880px]" : "col-span-1 min-h-[820px] xl:min-h-[880px]"
                    )}>

                        {/* Çalışma Masası Başlığı & Fihrist Aç/Kapa Kontrolü */}
                        <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {!isSidebarOpen && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-950/50 bg-slate-900/80 rounded-xl h-9 px-3 text-xs font-bold"
                                    >
                                        <PanelLeftOpen className="w-4 h-4 mr-1.5" />
                                        <span>Fihristi Aç</span>
                                    </Button>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg sm:text-xl font-black text-white">
                                            {activeTopic ? activeTopic.title : "Lütfen Bir Konu Seçin"}
                                        </h2>
                                        {hasUnsavedChanges && (
                                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full animate-pulse">
                                                Değişiklikler Kaydedilmedi
                                            </span>
                                        )}
                                    </div>
                                    {activeTopic && (
                                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                            <span>{activeTopic.className}</span>
                                            <span>•</span>
                                            <span>{activeTopic.courseTitle}</span>
                                            <span>•</span>
                                            <span className="text-slate-300 font-medium">{activeTopic.unitTitle}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Önceki / Sonraki Konu Gezinme Butonları */}
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
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

                        {/* ══ STÜDYO 6 TEMEL ÇALIŞMA SEKMESİ (AYRIŞTIRILMIŞ) ══ */}
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
                                    {missingDefinitionConcepts.length > 0 && (
                                        <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded font-bold" title={`${missingDefinitionConcepts.length} kavramın tanımı eksik!`}>
                                            ⚠️ {missingDefinitionConcepts.length}
                                        </span>
                                    )}
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
                                    {(missingDefinitionConcepts.length > 0 || emptyDefinitionCardCount > 0) && (
                                        <span className="text-[9px] font-mono px-1 py-0.2 bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded font-bold" title="Tanımı eksik olanlar var!">
                                            ⚠️ Eksik Var
                                        </span>
                                    )}
                                </button>

                                {/* Sekme 3: Defter Notları (Özet) */}
                                <button
                                    onClick={() => setActiveTab('notes')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'notes'
                                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                                            : "text-indigo-400 hover:text-white"
                                    )}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>3. Defter Notları (Özet)</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded font-bold">
                                        {editingNotes.length}
                                    </span>
                                </button>

                                {/* Sekme 4: Kısa Etkinlik Cümleleri (Oyun Havuzu) */}
                                <button
                                    onClick={() => setActiveTab('activitySentences')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'activitySentences'
                                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                                            : "text-emerald-400 hover:text-white"
                                    )}
                                >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                    <span>4. Kısa Etkinlik Cümleleri</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-black/30 rounded font-bold">
                                        {editingActivitySentences.length}
                                    </span>
                                </button>

                                {/* Sekme 5: Akıllı Tahta Önizleme */}
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
                                    <span>5. Akıllı Tahta Önizleme</span>
                                </button>

                                {/* Sekme 6: Ders Kitabı Metni */}
                                <button
                                    onClick={() => setActiveTab('source')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                                        activeTab === 'source'
                                            ? "bg-slate-700 text-white shadow-md"
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>6. Ders Kitabı Metni</span>
                                </button>
                            </div>

                            {/* Hızlı İstatistik Rozeti */}
                            {activeTopic && (
                                <div className="text-[11px] text-slate-400 font-mono hidden md:flex items-center gap-2">
                                    <span>Toplam:</span>
                                    <span className="text-blue-400 font-bold">{editingConcepts.length} Kelime</span>
                                    <span>•</span>
                                    <span className={cn("font-bold", missingDefinitionConcepts.length > 0 ? "text-amber-400" : "text-purple-400")}>
                                        {definedConceptsCount}/{editingConcepts.length} Tanımlı
                                    </span>
                                    <span>•</span>
                                    <span className="text-indigo-400 font-bold">{editingNotes.length} Not</span>
                                    <span>•</span>
                                    <span className="text-emerald-400 font-bold">{editingActivitySentences.length} Oyun Cümlesi</span>
                                </div>
                            )}
                        </div>

                        {/* ══ ÇALIŞMA ALANI İÇERİĞİ (SEÇİLİ SEKME) ══ */}
                        <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-[750px]">
                            
                            {/* ── 1. KAVRAMLAR (KELİME HAVUZU) SEKMESİ ── */}
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
                                                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-950/50"
                                                >
                                                    <Wand2 className="w-3.5 h-3.5 mr-1" /> Tanımsızları AI İle Tanımla ({missingDefinitionConcepts.length})
                                                </Button>
                                            )}
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
                                    </div>

                                    {/* Eksik Tanım Bilgi ve Hızlı Eylem Çubuğu */}
                                    {missingDefinitionConcepts.length > 0 && (
                                        <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                                            <div className="flex items-center gap-2.5">
                                                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
                                                <div className="text-xs text-amber-200">
                                                    <span className="font-bold">Eksik Tanım Uyarısı:</span> Aşağıda turuncu ile işaretlenmiş <strong>{missingDefinitionConcepts.length} kavramın</strong> tanımı henüz yazılmamış. Kavram Düellosu ve Eşleştirme oyunları için bu kavramlara tanım gereklidir.
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button
                                                    onClick={handleAddCardsForMissingConcepts}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-amber-500/50 text-amber-300 hover:bg-amber-900/40 hover:text-white text-[11px] h-8 rounded-xl font-bold"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Kart Olarak Ekle
                                                </Button>
                                                <Button
                                                    onClick={handleGenerateAiForMissingDefinitions}
                                                    disabled={isGeneratingAi}
                                                    size="sm"
                                                    className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] h-8 rounded-xl font-bold shadow"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-200" /> AI İle Tanımla
                                                </Button>
                                            </div>
                                        </div>
                                    )}

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
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl px-4"
                                        >
                                            <Plus className="w-4 h-4 mr-1" /> Ekle
                                        </Button>
                                    </div>

                                    {/* Kelime Etiketleri (Chip Grid) - TANIMI OLAN / OLMAYAN AYRIŞTIRILMIŞ */}
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
                                                                : "bg-amber-950/50 border-amber-500/70 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/40"
                                                        )}
                                                    >
                                                        <span className="font-bold">{concept}</span>

                                                        {/* Tanım Durumu Rozeti & Butonu */}
                                                        {hasDefinition ? (
                                                            <span
                                                                className="text-[9px] bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-mono"
                                                                title="Bu kavramın tanımı mevcut ✓"
                                                            >
                                                                <Check className="w-3 h-3 text-emerald-400" /> Tanımlı
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <span
                                                                    className="text-[9px] bg-amber-500/30 border border-amber-400/50 text-amber-300 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5"
                                                                    title="Bu kavramın tanımı henüz yazılmamış!"
                                                                >
                                                                    <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" /> Tanımsız
                                                                </span>
                                                                <button
                                                                    onClick={() => handleQuickAddDefinitionForConcept(concept)}
                                                                    className="text-[10px] font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 px-1.5 py-0.5 rounded transition-colors"
                                                                    title="Bu kavrama hemen tanım ekle"
                                                                >
                                                                    + Tanım Yaz
                                                                </button>
                                                            </div>
                                                        )}

                                                        <button
                                                            onClick={() => handleRemoveConcept(idx)}
                                                            className="text-slate-500 hover:text-red-400 transition-colors ml-0.5"
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
                                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Kelimeleri Çıkar
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── 2. KAVRAM-TANIM EŞLEŞMELİ SEKMESİ (EKSİK TANIM İŞARETLİ) ── */}
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
                                                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-950/50"
                                                >
                                                    <Wand2 className="w-3.5 h-3.5 mr-1" /> Eksikleri AI İle Tamamla ({missingDefinitionConcepts.length})
                                                </Button>
                                            )}
                                            <Button
                                                onClick={() => handleGenerateAi('definitions')}
                                                disabled={isGeneratingAi || !activeTopic}
                                                variant="outline"
                                                size="sm"
                                                className="border-purple-500/30 text-purple-300 hover:bg-purple-950/50 hover:text-white rounded-xl text-xs"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Tümünü Üret
                                            </Button>
                                            <Button
                                                onClick={handleAddDefinition}
                                                size="sm"
                                                className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
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
                                                        className="border-amber-500/50 text-amber-300 hover:bg-amber-900/40 text-[11px] h-7 px-2.5 rounded-lg font-bold"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" /> Boş Kart Olarak Aç
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={handleGenerateAiForMissingDefinitions}
                                                        disabled={isGeneratingAi}
                                                        className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] h-7 px-2.5 rounded-lg font-bold shadow"
                                                    >
                                                        <Sparkles className="w-3 h-3 mr-1 text-amber-200" /> AI İle Tanımla
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {missingDefinitionConcepts.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => handleQuickAddDefinitionForConcept(c)}
                                                        className="px-2.5 py-1 rounded-lg bg-amber-900/50 border border-amber-500/40 hover:border-amber-400 text-amber-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                                                        title="Tıklayarak bu kavram için tanım yazın"
                                                    >
                                                        <span>{c}</span>
                                                        <span className="text-[10px] text-amber-400 underline font-bold">+ Tanım Yaz</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tanımlar Listesi - EKSİK TANIMLAR VURGULANMIŞ */}
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
                                                                className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl"
                                                                title="Kartı Sil"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                        <Textarea
                                                            placeholder={isDefEmpty
                                                                ? "⚠️ Bu kavramın tanımı henüz yazılmamış! Kavram Düellosu ve Eşleştirme oyunlarında soru olarak sorulması için lütfen bir tanım girin..."
                                                                : "Kavramın açıklaması ve tanımı (Kavram Düellosu için tanımda kavramın adını geçirmeyin)..."
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
                                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI İle Tanımları Üret
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
                                                className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-950/50 hover:text-white rounded-xl text-xs"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Notları Üret
                                            </Button>
                                            <Button
                                                onClick={handleAddNote}
                                                size="sm"
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Yeni Not Ekle
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Bilgilendirme Kutusu */}
                                    <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-xs text-indigo-200">
                                        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                        <span>
                                            Bu maddeler akıllı tahtadaki <strong>"NOTLAR"</strong> sekmesinde numaralandırılarak gösterilir ve öğrencilerin defterine yazacağı pedagojik ders özetleridir.
                                        </span>
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
                                                        className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl flex-shrink-0 mt-1"
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
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
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
                                                Cümle Kurma (kelimelerin sıraya dizildiği oyun), Doğru-Yanlış Zinciri ve Tornado oyunlarında kullanılır.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {editingNotes.length > 0 && (
                                                <Button
                                                    onClick={handleTransferNotesToActivitySentences}
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 rounded-xl text-xs"
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
                                                className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/50 hover:text-white rounded-xl text-xs"
                                            >
                                                <Wand2 className="w-3.5 h-3.5 mr-1" /> AI İle Kısa Cümle Üret
                                            </Button>
                                            <Button
                                                onClick={handleAddActivitySentence}
                                                size="sm"
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Yeni Cümle Ekle
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Oyun Motoru İpucu Uyarısı */}
                                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs text-emerald-200">
                                        <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>
                                            <strong>Oyun İpucu:</strong> Cümle Kurma oyununda cümleler kelime kelime parçalanıp öğrencilere dizdirilir. Bu yüzden buradaki cümleler <strong>4 ila 8 kelimelik KISA ve YALIN</strong> olmalıdır. Uzun paragraflar oyunlarda oynanışı bozar.
                                        </span>
                                    </div>

                                    {/* Oyun Cümleleri Listesi */}
                                    {editingActivitySentences.length > 0 ? (
                                        <div className="space-y-3">
                                            {editingActivitySentences.map((sentence, idx) => {
                                                const wordCount = sentence.trim().split(/\s+/).filter(Boolean).length;
                                                const isIdealLength = wordCount >= 4 && wordCount <= 9;
                                                const isTooLong = wordCount >= 10;
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
                                                            <div className="flex items-center gap-2">
                                                                {sentence.trim() && (
                                                                    <span className={cn(
                                                                        "text-[10px] font-mono px-2 py-0.5 rounded-full border",
                                                                        isIdealLength
                                                                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                                                                            : isTooLong
                                                                                ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                                                                                : "bg-slate-950 border-white/10 text-slate-400"
                                                                    )}>
                                                                        {wordCount} kelime {isIdealLength ? "• İdeal Oyun Boyutu ✓" : isTooLong ? "• Oyun için biraz uzun!" : ""}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveActivitySentence(idx)}
                                                            className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-xl flex-shrink-0 mt-1"
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
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
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
                                    {/* Önizleme Kontrol Çubuğu */}
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-white/10">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPreviewSubTab('kavramlar')}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
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
                                                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
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
                                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-center"
                                                >
                                                    -
                                                </button>
                                                <span className="font-mono text-cyan-300 w-8 text-center">{fontSize.toFixed(1)}x</span>
                                                <button
                                                    onClick={() => setFontSize(f => Math.min(2.2, f + 0.1))}
                                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-center"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <Button
                                                asChild
                                                size="sm"
                                                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
                                            >
                                                <Link href={smartboardPlayUrl} target="_blank">
                                                    <Maximize className="w-3.5 h-3.5 mr-1" /> Tahtada Başlat
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Simüle Edilen Akıllı Tahta Ekranı */}
                                    <div
                                        ref={previewContainerRef}
                                        className="bg-slate-950 rounded-3xl border-4 border-slate-800 p-6 sm:p-8 min-h-[480px] shadow-2xl relative overflow-hidden"
                                    >
                                        {/* Tahta Üst Başlığı */}
                                        <div className="text-center pb-6 border-b border-white/10 mb-6">
                                            <span className="text-xs uppercase tracking-widest text-purple-400 font-bold">
                                                {activeTopic ? activeTopic.unitTitle : ''}
                                            </span>
                                            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                                                {activeTopic ? activeTopic.title : 'Konu Başlığı'}
                                            </h2>
                                        </div>

                                        {/* KAVRAMLAR GÖRÜNÜMÜ */}
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

                                        {/* NOTLAR GÖRÜNÜMÜ */}
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
                    </div>
                </div>

            </div>
        </div>
    );
}

function StudioLoadingScreen() {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                <p className="text-slate-400 font-bold text-lg">Merkezi Etkinlik & Kavram Stüdyosu Yükleniyor...</p>
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
