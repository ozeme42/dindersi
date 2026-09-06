"use client";

import { useState, useEffect, useMemo } from "react";
import isEqual from 'lodash.isequal';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, PlusCircle, Trash2, Save, FileEdit, Database, 
    List, Library, ArrowLeft, ArrowRight, CheckCircle2, XCircle,
    Video, Image as ImageIcon, FileText, HelpCircle, Gamepad2, Puzzle, Shuffle, Layers, Sparkles,
    ChevronUp, ChevronDown, Send, Lightbulb, Wand2, Eye
} from 'lucide-react';
import { refineLessonStep } from '@/ai/flows/refine-lesson-step';
import type { 
    ActivityItem, LessonStep, AnagramGameStep, AnagramFlashcardStep, 
    SentenceScrambleStep, FlashcardStep, AccordionStep, ConceptExplanationStep, 
    FitbStep, IframeStep, McqStep, ObjectiveListStep, TfStep, TrueFalseListStep, 
    VideoStep, VisualStep, Question, ImageAsset, Course, Unit, Topic, SchoolClass, HtmlSlideStep, HookQuestionStep,
    NotebookNoteStep, ProcessFlowStep, ConceptMatrixStep, CategoryTableStep, CategoryTableColumn
} from '@/lib/types';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, cleanForAnagram } from "@/lib/utils";
import { LibraryImportDialog } from './library-import-dialog';
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "./ui/checkbox";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from 'firebase/firestore';

const getInitialFormData = (item: Partial<LessonStep> | null): LessonStep | null => {
    if (!item) return null;
    
    // Var olan yapıyı koru ve normalize et
    const normalized: any = {
        id: (item as any)?.id || `step-${Date.now()}-${Math.random()}`,
        type: item.type || 'content',
        title: item.title || '',
        ...item,
    };

    // content normalizasyonu
    if (normalized.type === 'content') {
        if (Array.isArray(normalized.content)) {
            normalized.content = `<ul>${normalized.content.map((s: any) => `<li>${typeof s === 'string' ? s : JSON.stringify(s)}</li>`).join('')}</ul>`;
        } else if (Array.isArray(normalized.sentences)) {
            normalized.content = `<ul>${normalized.sentences.map((s: any) => `<li>${typeof s === 'string' ? s : JSON.stringify(s)}</li>`).join('')}</ul>`;
        } else if (typeof normalized.content === 'string' && !normalized.content.includes('<li') && !normalized.content.includes('<p')) {
            normalized.content = `<ul>${normalized.content.split('\n').filter(Boolean).map((s: string) => `<li>${s.trim()}</li>`).join('')}</ul>`;
        }
    }

    // conceptExplanation normalizasyonu
    if (normalized.type === 'conceptExplanation') {
        normalized.items = normalized.items || normalized.content?.items || [{ concept: 'Kavram', definition: 'Tanım' }];
    }
    // flashcard normalizasyonu
    if (normalized.type === 'flashcard') {
        normalized.cards = normalized.cards || [{ term: 'Terim', definition: 'Tanım' }];
    }
    // matching normalizasyonu
    if (normalized.type === 'matching' || normalized.type === 'conceptMatching') {
        normalized.pairs = normalized.pairs || [{ concept: 'Kavram', definition: 'Tanım' }];
    }
    // trueFalseList normalizasyonu
    if (normalized.type === 'trueFalseList') {
        normalized.questions = normalized.questions || [{ statement: 'Yeni ifade...', isTrue: true }];
    }
    // objectiveList normalizasyonu
    if (normalized.type === 'objectiveList') {
        normalized.items = normalized.items || ['Yeni hedef...'];
    }
    // hookQuestion normalizasyonu
    if (normalized.type === 'hookQuestion') {
        normalized.question = normalized.question || 'Konuyla ilgili merak uyandırıcı soru...';
        normalized.thoughtStarter = normalized.thoughtStarter || '';
        normalized.tag = normalized.tag || '🤔 Merak & Düşünce Sorusu';
    }
    // notebookNote normalizasyonu
    if (normalized.type === 'notebookNote') {
        normalized.noteTitle = normalized.noteTitle || 'Dersin En Önemli Özet Maddeleri';
        normalized.notes = normalized.notes || ['1. Önemli ders notu...'];
        normalized.suggestedMinutes = normalized.suggestedMinutes || 3;
    }
    // processFlow normalizasyonu
    if (normalized.type === 'processFlow') {
        normalized.steps = normalized.steps || [
            { stepNumber: 1, title: '1. Aşama Başlığı', description: 'Aşamanın kısa açıklaması...' },
            { stepNumber: 2, title: '2. Aşama Başlığı', description: 'İkinci aşamanın açıklaması...' }
        ];
    }
    // conceptMatrix normalizasyonu
    if (normalized.type === 'conceptMatrix') {
        normalized.topicName = normalized.topicName || '';
        normalized.quadrants = normalized.quadrants || [
            { label: '1. Nedir? (Tanım)', content: 'Temel tanım...' },
            { label: '2. Niçin Önemlidir? (Amaç)', content: 'Önemi ve hikmeti...' },
            { label: '3. Nasıl Uygulanır? (Pratik)', content: 'Uygulama şekli...' },
            { label: '4. Bize Ne Kazandırır? (Fayda)', content: 'Bireysel ve toplumsal faydaları...' }
        ];
    }
    // categoryTable normalizasyonu
    if (normalized.type === 'categoryTable') {
        normalized.tableTitle = normalized.tableTitle || normalized.title || 'Konu Sınıflandırma Tablosu';
        normalized.description = normalized.description || '';
        normalized.categories = normalized.categories || [
            { name: 'Farz Namazlar', badge: 'Kesin Emir', color: 'emerald', items: ['5 Vakit Namaz', 'Cuma Namazı', 'Cenaze Namazı'] },
            { name: 'Vacip Namazlar', badge: 'Kuvvetli Emir', color: 'amber', items: ['Vitir Namazı', 'Bayram Namazları'] },
            { name: 'Sünnet / Nafile', badge: 'Peygamber Sünneti', color: 'indigo', items: ['Revatib Sünnetler', 'Teravih Namazı', 'Kuşluk ve Teheccüd'] }
        ];
    }

    return normalized as LessonStep;
};

type StepEditorDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    step: LessonStep | null;
    onSave: (updatedStep: LessonStep) => void;
    isSaving: boolean;
    context?: { courseId?: string | null, unitId?: string | null, topicId?: string | null, topicTitle?: string, sourceText?: string };
};

export function StepEditorDialog({ isOpen, onOpenChange, step, onSave, isSaving, context }: StepEditorDialogProps) {
    const [editedStep, setEditedStep] = useState<LessonStep | null>(null);
    const [initialData, setInitialData] = useState<Partial<LessonStep>>({});
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [contentViewMode, setContentViewMode] = useState<'list' | 'raw'>('list');
    const [aiRefinePrompt, setAiRefinePrompt] = useState('');
    const [isAiRefining, setIsAiRefining] = useState(false);
    const [isAiRefineOpen, setIsAiRefineOpen] = useState(true);
    const [isHtmlPreviewActive, setIsHtmlPreviewActive] = useState(true);
    
    const { toast } = useToast();
    const [allCourses, setAllCourses] = useState<(Course & { units: (Unit & { topics: Topic[]})[]})[]>([]);

    const handleAiRefine = async (instructionToUse?: string) => {
        const finalInstruction = (instructionToUse || aiRefinePrompt).trim();
        if (!finalInstruction || !editedStep) return;

        setIsAiRefining(true);
        try {
            const activeKey = (typeof window !== 'undefined' ? localStorage.getItem('custom_gemini_api_key') : '') || undefined;
            const activeModel = (typeof window !== 'undefined' ? localStorage.getItem('custom_gemini_model') : '') || 'gemini-3.6-flash';

            const result = await refineLessonStep({
                currentStep: editedStep,
                instruction: finalInstruction,
                topicTitle: context?.topicTitle,
                sourceText: context?.sourceText,
                apiKey: activeKey,
                modelName: activeModel,
            });

            if (result.updatedStep) {
                const normalized = getInitialFormData(result.updatedStep);
                setEditedStep(JSON.parse(JSON.stringify(normalized)));
                setAiRefinePrompt('');
                toast({
                    title: "✨ Adım Yapay Zekâ ile Güncellendi",
                    description: result.explanation,
                });
            }
        } catch (err: any) {
            toast({
                title: "Düzenleme Hatası",
                description: err.message || "Adım düzenlenirken bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsAiRefining(false);
        }
    };
    
    // activityLink için ders ağacı yükleme
    useEffect(() => {
        if (isOpen && editedStep?.type === 'activityLink' && allCourses.length === 0) {
            const fetchCourses = async () => {
                try {
                    const coursesSnapshot = await getDocs(query(collection(db, "courses")));
                    const coursesData = await Promise.all(coursesSnapshot.docs.map(async (courseDoc) => {
                        const course = { id: courseDoc.id, ...courseDoc.data() } as Course & { units: (Unit & { topics: Topic[]})[] };
                        const unitsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units`)));
                        course.units = await Promise.all(unitsSnapshot.docs.map(async (unitDoc) => {
                            const unit = { id: unitDoc.id, ...unitDoc.data() } as Unit & { topics: Topic[] };
                            const topicsSnapshot = await getDocs(query(collection(db, `courses/${course.id}/units/${unit.id}/topics`)));
                            unit.topics = topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Topic);
                            return unit;
                        }));
                        return course;
                    }));
                    setAllCourses(coursesData);
                } catch (e) {
                    console.error("Courses fetch error in StepEditorDialog:", e);
                }
            };
            fetchCourses();
        }
    }, [isOpen, editedStep?.type, allCourses.length]);

    useEffect(() => {
        if (isOpen && step) {
            const initial = getInitialFormData(step);
            setEditedStep(initial);
            setInitialData(initial ? JSON.parse(JSON.stringify(initial)) : {});
        } else if (!isOpen) {
            setEditedStep(null);
        }
    }, [step, isOpen]);

    const isDirty = !isEqual(initialData, editedStep);

    const handleValueChange = (field: string, value: any) => {
        setEditedStep(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [field]: value
            };
        });
    };

    const handleArrayChange = (arrayField: string, index: number, subField: string | null, value: any) => {
        setEditedStep(prev => {
            if (!prev) return null;
            const currentArray = (prev as any)[arrayField] ? [...(prev as any)[arrayField]] : [];
            if (subField) {
                currentArray[index] = { ...currentArray[index], [subField]: value };
            } else {
                currentArray[index] = value;
            }
            return {
                ...prev,
                [arrayField]: currentArray
            };
        });
    };

    const addToArray = (arrayField: string) => {
        setEditedStep(prev => {
            if (!prev) return null;
            const currentArray = (prev as any)[arrayField] ? [...(prev as any)[arrayField]] : [];
            const newItemId = `item-${Date.now()}-${Math.random()}`;

            let newItem: any;
            if (arrayField === 'items' && prev.type === 'conceptExplanation') {
                newItem = { concept: 'Yeni Kavram', definition: 'Yeni Tanım' };
            } else if (arrayField === 'items' && prev.type === 'accordion') {
                newItem = { id: newItemId, title: 'Yeni Başlık', content: 'Yeni İçerik' };
            } else if (arrayField === 'items' && prev.type === 'objectiveList') {
                newItem = 'Yeni Öğrenme Hedefi...';
            } else if (arrayField === 'cards' && prev.type === 'flashcard') {
                newItem = { term: 'Yeni Terim', definition: 'Yeni Tanım' };
            } else if (arrayField === 'cards' && (prev.type === 'anagramGame' || prev.type === 'anagramFlashcard')) {
                newItem = { definition: 'İpucu / Tanım', scrambledWord: 'KAVRAM', correctAnswer: 'KAVRAM' };
            } else if (arrayField === 'questions' && prev.type === 'trueFalseList') {
                newItem = { statement: 'Yeni İfade...', isTrue: true };
            } else {
                newItem = '';
            }

            return {
                ...prev,
                [arrayField]: [...currentArray, newItem]
            };
        });
    };

    const removeFromArray = (arrayField: string, indexToRemove: number) => {
        setEditedStep(prev => {
            if (!prev) return null;
            const currentArray = (prev as any)[arrayField] ? [...(prev as any)[arrayField]] : [];
            return {
                ...prev,
                [arrayField]: currentArray.filter((_: any, idx: number) => idx !== indexToRemove)
            };
        });
    };

    const handleSubmit = () => {
        if (editedStep) {
            onSave(editedStep);
        }
    };

    const libraryConfig = useMemo(() => {
        if (!editedStep) return null;
        switch (editedStep.type) {
            case 'flashcard': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'flashcard' as const };
            case 'anagramFlashcard': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'anagramFlashcard' as const };
            case 'anagramGame': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'anagramGame' as const };
            case 'sentenceScramble': return { enabled: true, filter: ['sentence'], multiSelect: true, stepType: 'sentenceScramble' as const };
            case 'conceptExplanation': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'keyConcepts' as const };
            case 'matching':
            case 'conceptMatching': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'keyConcepts' as const };
            default: return { enabled: false, filter: [], multiSelect: false, stepType: 'content' as const };
        }
    }, [editedStep]);

    const handleAutoLoadMatchingFromTopic = async () => {
        const topicId = context?.topicId;
        if (!topicId) {
            toast({ title: "Konu Seçilmedi", description: "Bu konunun ID bilgisi bulunamadı.", variant: "destructive" });
            return;
        }
        try {
            const res = await fetch(`/curriculum/activity-items/${topicId}.json?v=${Date.now()}`);
            if (!res.ok) {
                toast({ title: "Veri Bulunamadı", description: "Bu konuya ait etkinlik veritabanında kavram bulunamadı.", variant: "destructive" });
                return;
            }
            const data = await res.json();
            const loadedPairs: { concept: string; definition: string }[] = [];
            
            if (Array.isArray(data)) {
                data.forEach((item: any) => {
                    const concept = item.content?.term || item.content?.text || item.concept || item.term || item.title;
                    const definition = item.content?.definition || item.definition || '';
                    if (concept && definition) {
                        loadedPairs.push({ concept: String(concept).trim(), definition: String(definition).trim() });
                    }
                });
            }
            
            if (loadedPairs.length > 0) {
                setEditedStep(prev => prev ? ({ ...prev, pairs: loadedPairs } as any) : prev);
                toast({ title: "Kavramlar Yüklendi!", description: `Veri bankasından ${loadedPairs.length} kavram-tanım çifti başarıyla aktarıldı.` });
            } else {
                toast({ title: "Kavram Bulunamadı", description: "Bu konuda henüz kayıtlı kavram tanımı bulunmuyor.", variant: "destructive" });
            }
        } catch (err: any) {
            console.error("Auto load matching pairs failed:", err);
            toast({ title: "Hata", description: "Veriler yüklenirken hata oluştu.", variant: "destructive" });
        }
    };

    const handleSelectFromLibrary = (items: (ActivityItem | Question | ImageAsset)[], stepType: any) => {
        if (!editedStep || items.length === 0) return;

        if (stepType === 'flashcard') {
            const newCards = items.map(item => ({ 
                term: (item as ActivityItem).content?.term || (item as any).title || '', 
                definition: (item as ActivityItem).content?.definition || (item as any).definition || ''
            }));
            setEditedStep(prev => ({ ...(prev as any), cards: newCards } as FlashcardStep));
        } else if (stepType === 'anagramGame' || stepType === 'anagramFlashcard') {
            const newCards = items.map(item => {
                const term = (item as ActivityItem).content?.term || (item as ActivityItem).content?.text || '';
                const cleanWord = cleanForAnagram(term);
                return {
                    definition: (item as ActivityItem).content?.definition || `Bu kelime: "${term}"`,
                    correctAnswer: cleanWord,
                    scrambledWord: cleanWord.replace(/\s/g, '').split('').sort(() => Math.random() - 0.5).join('').toLocaleUpperCase('tr-TR'),
                };
            });
            setEditedStep(prev => ({ ...(prev as any), cards: newCards }));
        } else if (stepType === 'sentenceScramble') {
            const newSentence = (items[0] as ActivityItem)?.content?.text || '';
            const shuffleSentence = (s: string) => s.split(' ').sort(() => Math.random() - 0.5).join(' ');
            setEditedStep(prev => ({
                ...(prev as any),
                correctSentence: newSentence,
                scrambledSentence: shuffleSentence(newSentence),
            } as SentenceScrambleStep));
        } else if (stepType === 'keyConcepts') {
            if (editedStep.type === 'matching' || (editedStep as any).type === 'conceptMatching') {
                const newPairs = items.map(item => ({
                    concept: (item as ActivityItem).content?.term || (item as ActivityItem).content?.text || (item as any).concept || (item as any).title || 'Kavram',
                    definition: (item as ActivityItem).content?.definition || (item as any).definition || ''
                }));
                setEditedStep(prev => ({ ...(prev as any), pairs: newPairs } as any));
            } else {
                const newItems = items.map(item => ({
                    concept: (item as ActivityItem).content?.term || (item as ActivityItem).content?.text || 'Kavram',
                    definition: (item as ActivityItem).content?.definition || ''
                }));
                setEditedStep(prev => ({ ...(prev as any), items: newItems } as ConceptExplanationStep));
            }
        }
        setIsLibraryOpen(false);
    };

    if (!isOpen || !editedStep) return null;

    const selectedCourseData = allCourses.find(c => c.id === (editedStep as any).courseId);
    const selectedUnitData = selectedCourseData?.units.find(u => u.id === (editedStep as any).unitId);

    const parseContentSentences = (html: string): string[] => {
        if (!html || typeof html !== 'string') return [];
        if (typeof window === 'undefined') return [];
        try {
            const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
            const lis = doc.querySelectorAll('li');
            if (lis.length > 0) {
                return Array.from(lis).map(li => li.textContent?.trim() || li.innerHTML.trim()).filter(Boolean);
            }
            const ps = doc.querySelectorAll('p');
            if (ps.length > 0) {
                return Array.from(ps).map(p => p.textContent?.trim() || p.innerHTML.trim()).filter(Boolean);
            }
        } catch (e) {}
        return html.split('\n').map(s => s.trim()).filter(Boolean);
    };

    const updateContentSentences = (newSentences: string[]) => {
        const html = `<ul>${newSentences.map(s => `<li>${s.replace(/^<li>|<\/li>$/g, '')}</li>`).join('')}</ul>`;
        handleValueChange('content', html);
    };

    const renderEditorFields = () => {
        switch (editedStep.type) {
            case 'content': {
                const currentContent = (editedStep as any).content || '';
                const sentences = parseContentSentences(currentContent);

                const moveSentence = (index: number, direction: 'up' | 'down') => {
                    const newIndex = direction === 'up' ? index - 1 : index + 1;
                    if (newIndex < 0 || newIndex >= sentences.length) return;
                    const updated = [...sentences];
                    const temp = updated[index];
                    updated[index] = updated[newIndex];
                    updated[newIndex] = temp;
                    updateContentSentences(updated);
                };

                return (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/90 border border-white/10 shadow-sm">
                            <div>
                                <div className="flex items-center gap-2.5 mb-1">
                                    <Label className="text-sm font-black text-white">
                                        {contentViewMode === 'list' ? '✨ Cümle & Madde Listesi (Sunum Akışı)' : '📝 Serbest HTML / Kod Modu'}
                                    </Label>
                                    {contentViewMode === 'list' && (
                                        <span className="text-[11px] font-black text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                                            {sentences.length} Cümle
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-400">
                                    {contentViewMode === 'list' 
                                        ? 'Cümleler sunumda "Devam Et" butonuna basıldıkça sırayla ekrana gelecektir. Buradan kolayca düzenleyebilirsiniz.' 
                                        : 'Özel HTML veya zengin metin düzenleme.'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                                {contentViewMode === 'list' && (
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        onClick={() => {
                                            const updated = [...sentences, 'Yeni açıklama cümlesi...'];
                                            updateContentSentences(updated);
                                        }} 
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl h-9 px-4 shadow-md shadow-indigo-950/50"
                                    >
                                        <PlusCircle className="mr-1.5 h-4 w-4" /> Cümle Ekle
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setContentViewMode(contentViewMode === 'list' ? 'raw' : 'list')}
                                    className="border-white/10 text-xs text-slate-300 hover:text-white rounded-xl h-9 px-3 bg-slate-950"
                                >
                                    {contentViewMode === 'list' ? '📝 Kod / HTML Modu' : '✨ Görsel Cümle Modu'}
                                </Button>
                            </div>
                        </div>

                        {contentViewMode === 'list' ? (
                            <div className="space-y-3 pb-6">
                                {sentences.length > 0 ? (
                                    <>
                                        {sentences.map((sentence, idx) => (
                                            <div key={`sentence-${idx}`} className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/50 transition-all shadow-sm">
                                                <div className="flex flex-col items-center gap-1 mt-0.5">
                                                    <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-500/30">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex flex-col gap-0.5">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={idx === 0}
                                                            onClick={() => moveSentence(idx, 'up')}
                                                            className="h-6 w-6 text-slate-400 hover:text-white disabled:opacity-20 p-0"
                                                            title="Yukarı Taşı"
                                                        >
                                                            <ChevronUp className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={idx === sentences.length - 1}
                                                            onClick={() => moveSentence(idx, 'down')}
                                                            className="h-6 w-6 text-slate-400 hover:text-white disabled:opacity-20 p-0"
                                                            title="Aşağı Taşı"
                                                        >
                                                            <ChevronDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    value={sentence}
                                                    onChange={(e) => {
                                                        const updated = [...sentences];
                                                        updated[idx] = e.target.value;
                                                        updateContentSentences(updated);
                                                    }}
                                                    rows={3}
                                                    className="bg-slate-950/90 border-white/10 text-white text-sm leading-relaxed rounded-xl flex-1 focus:border-indigo-500 min-h-[72px]"
                                                    placeholder={`${idx + 1}. cümle açıklamasını buraya yazın...`}
                                                />
                                                <Button 
                                                    type="button"
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => {
                                                        const updated = sentences.filter((_, sIdx) => sIdx !== idx);
                                                        updateContentSentences(updated);
                                                    }} 
                                                    className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 h-9 w-9 rounded-xl mt-1 flex-shrink-0"
                                                    title="Cümleyi Sil"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        {/* Alt Cümle Ekle Butonu */}
                                        <div className="pt-2 flex justify-center">
                                            <Button 
                                                type="button"
                                                size="sm" 
                                                onClick={() => {
                                                    const updated = [...sentences, 'Yeni açıklama cümlesi...'];
                                                    updateContentSentences(updated);
                                                }} 
                                                className="w-full bg-slate-900/90 hover:bg-indigo-600/30 border border-dashed border-indigo-500/40 text-indigo-300 hover:text-white font-bold text-xs rounded-2xl h-12 transition-all"
                                            >
                                                <PlusCircle className="mr-2 h-4 w-4" /> + Listenin Sonuna Yeni Cümle Ekle
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-3xl bg-slate-900/40 p-6">
                                        <p className="text-sm text-slate-400 mb-4">Bu adım altında henüz cümle bulunmuyor.</p>
                                        <Button 
                                            type="button"
                                            onClick={() => updateContentSentences(['İlk açıklama cümlesi...'])}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl h-10 px-5"
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" /> İlk Cümleyi Ekle
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-slate-400">Ham HTML Düzenleme & Önizleme</Label>
                                    <button
                                        type="button"
                                        onClick={() => setIsHtmlPreviewActive(v => !v)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                                            isHtmlPreviewActive
                                                ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300"
                                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                        )}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        {isHtmlPreviewActive ? "Canlı Önizleme Açık" : "Önizlemeyi Aç"}
                                    </button>
                                </div>
                                <div className={cn("rounded-2xl border border-white/10 overflow-hidden bg-slate-950/80 flex", isHtmlPreviewActive ? "divide-x divide-white/10" : "")}>
                                    <div className={cn("flex flex-col", isHtmlPreviewActive ? "w-1/2" : "w-full")}>
                                        <div className="px-3 py-1.5 bg-slate-900/60 border-b border-white/5">
                                            <span className="text-[10px] font-mono text-slate-400">HTML Kodu</span>
                                        </div>
                                        <Textarea 
                                            value={currentContent} 
                                            onChange={(e) => handleValueChange('content', e.target.value)} 
                                            className="min-h-[340px] h-[340px] bg-slate-950 border-0 text-white font-mono text-xs leading-relaxed p-4 resize-none focus-visible:ring-0 rounded-none" 
                                            placeholder="Metin içeriğinizi buraya girin. HTML etiketlerini (<p>, <strong>, <ul>, <li> vb.) destekler."
                                        />
                                    </div>
                                    {isHtmlPreviewActive && (
                                        <div className="w-1/2 flex flex-col bg-slate-900/30">
                                            <div className="px-3 py-1.5 bg-slate-900/60 border-b border-white/5 flex items-center gap-2">
                                                <span className="text-[10px] font-mono text-slate-400">Canlı Görünüm</span>
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            </div>
                                            <div className="p-4 bg-slate-950/60 text-slate-200 overflow-y-auto max-h-[340px] h-[340px] text-sm leading-relaxed">
                                                <div 
                                                    className="prose prose-invert max-w-none text-slate-200"
                                                    dangerouslySetInnerHTML={{ __html: currentContent || '<p class="text-slate-500 italic">HTML yazdıkça önizleme burada görünür...</p>' }} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            }

            case 'hookQuestion': {
                const hookStep = editedStep as HookQuestionStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                                🏷️ Üst Rozet / Etiket Metni
                            </Label>
                            <Input 
                                value={hookStep.tag || ''} 
                                onChange={(e) => handleValueChange('tag', e.target.value)} 
                                className="bg-slate-950 border-white/10 text-white font-semibold" 
                                placeholder="Örn: 🤔 Derse Başlarken: Bir Düşünelim!"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                ❓ Dikkat Çekici Giriş Sorusu Metni *
                            </Label>
                            <Textarea 
                                value={hookStep.question || ''} 
                                onChange={(e) => handleValueChange('question', e.target.value)} 
                                className="min-h-[100px] bg-slate-950 border-white/10 text-white font-bold text-base leading-relaxed rounded-2xl p-4" 
                                placeholder="Örn: Eğer dünyada adalet ve dürüstlük tamamen yok olsaydı, insanlar güvenle bir gün bile yaşayabilir miydi?"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                                💡 Düşünme & Tartışma İpucu (Thought Starter)
                            </Label>
                            <Textarea 
                                value={hookStep.thoughtStarter || ''} 
                                onChange={(e) => handleValueChange('thoughtStarter', e.target.value)} 
                                className="min-h-[80px] bg-slate-950 border-amber-500/20 text-amber-100 text-sm leading-relaxed rounded-2xl p-4" 
                                placeholder="Örn: Arkadaşlarınızla tartışın: Günlük hayatınızda adaletin ne kadar vazgeçilmez olduğunu gösteren bir örnek verebilir misiniz?"
                            />
                        </div>
                    </div>
                );
            }

            case 'notebookNote': {
                const noteStep = editedStep as NotebookNoteStep;
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2 space-y-1.5">
                                <Label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                    📝 Defter Başlığı
                                </Label>
                                <Input
                                    value={noteStep.noteTitle || ''}
                                    onChange={(e) => handleValueChange('noteTitle', e.target.value)}
                                    className="bg-slate-950 border-white/10 text-white font-semibold"
                                    placeholder="Örn: Dersin En Önemli Özet Notları"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    ⏳ Süre (Dakika)
                                </Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={15}
                                    value={noteStep.suggestedMinutes || 3}
                                    onChange={(e) => handleValueChange('suggestedMinutes', Number(e.target.value))}
                                    className="bg-slate-950 border-white/10 text-white font-semibold"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    ✏️ Deftere Yazılacak Maddeler (Özetler)
                                </Label>
                                <Button size="sm" onClick={() => addToArray('notes')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs">
                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Madde Ekle
                                </Button>
                            </div>
                            {(noteStep.notes || []).map((item, index) => (
                                <div key={`note-${index}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-white/10">
                                    <span className="w-6 text-center text-xs font-mono font-bold text-emerald-400">{index + 1}.</span>
                                    <Input
                                        value={item}
                                        onChange={e => handleArrayChange('notes', index, null, e.target.value)}
                                        className="bg-slate-950 border-white/10 flex-1"
                                        placeholder="Örn: İslam dininde adalet her şeyin temelidir."
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => removeFromArray('notes', index)} className="text-slate-400 hover:text-rose-400">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Kavram & Tanımlar Bölümü (Varsa) */}
                        <div className="space-y-3 pt-2 border-t border-white/10">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                                    📖 Kavramlar & Tanımlar ({noteStep.conceptDefinitions?.length || 0})
                                </Label>
                                <Button 
                                    size="sm" 
                                    onClick={() => {
                                        setEditedStep(prev => ({
                                            ...(prev as any),
                                            conceptDefinitions: [...((prev as any)?.conceptDefinitions || []), { concept: 'Yeni Kavram', definition: 'Tanımı...' }]
                                        }));
                                    }} 
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                                >
                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Kavram Ekle
                                </Button>
                            </div>
                            {(noteStep.conceptDefinitions || []).map((item, index) => (
                                <div key={`cd-${index}`} className="p-3 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold text-xs">
                                            #{index + 1}
                                        </span>
                                        <Input
                                            value={item.concept}
                                            onChange={e => handleArrayChange('conceptDefinitions', index, 'concept', e.target.value)}
                                            className="bg-slate-950 border-white/10 font-bold text-sm text-cyan-200 flex-1"
                                            placeholder="Kavram Adı"
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeFromArray('conceptDefinitions', index)} className="text-slate-400 hover:text-rose-400">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={item.definition}
                                        onChange={e => handleArrayChange('conceptDefinitions', index, 'definition', e.target.value)}
                                        className="bg-slate-950 border-white/10 text-xs min-h-[50px]"
                                        placeholder="Kavramın açıklaması..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'processFlow': {
                const flowStep = editedStep as ProcessFlowStep;
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                🪜 Yol Haritası / Süreç Aşamaları
                            </Label>
                            <Button
                                size="sm"
                                onClick={() => {
                                    const nextNum = (flowStep.steps || []).length + 1;
                                    setEditedStep(prev => ({
                                        ...(prev as any),
                                        steps: [...((prev as any)?.steps || []), { stepNumber: nextNum, title: `${nextNum}. Aşama`, description: 'Açıklama...' }]
                                    }));
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                            >
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Aşama Ekle
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {(flowStep.steps || []).map((st, index) => (
                                <div key={`step-${index}`} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 font-black text-xs">
                                            Adım {index + 1}
                                        </span>
                                        <Input
                                            value={st.title}
                                            onChange={e => handleArrayChange('steps', index, 'title', e.target.value)}
                                            className="bg-slate-950 border-white/10 flex-1 font-bold text-sm"
                                            placeholder="Aşama Başlığı"
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeFromArray('steps', index)} className="text-slate-400 hover:text-rose-400">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={st.description}
                                        onChange={e => handleArrayChange('steps', index, 'description', e.target.value)}
                                        className="bg-slate-950 border-white/10 text-xs min-h-[60px]"
                                        placeholder="Bu aşamanın detaylı açıklaması..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'conceptMatrix': {
                const matStep = editedStep as ConceptMatrixStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                                🔲 İncelenen Konu Başlığı (Opsiyonel)
                            </Label>
                            <Input
                                value={matStep.topicName || ''}
                                onChange={(e) => handleValueChange('topicName', e.target.value)}
                                className="bg-slate-950 border-white/10 text-white font-semibold"
                                placeholder="Örn: Namaz İbadeti"
                            />
                        </div>

                        <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                            4 Boyutun Açıklamaları
                        </Label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(matStep.quadrants || []).map((quad, index) => (
                                <div key={`quad-${index}`} className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                                    <Input
                                        value={quad.label}
                                        onChange={e => handleArrayChange('quadrants', index, 'label', e.target.value)}
                                        className="bg-slate-950 border-white/10 font-black text-xs text-purple-300"
                                        placeholder="Boyut Etiketi (Örn: 1. Nedir?)"
                                    />
                                    <Textarea
                                        value={quad.content}
                                        onChange={e => handleArrayChange('quadrants', index, 'content', e.target.value)}
                                        className="bg-slate-950 border-white/10 text-xs min-h-[80px]"
                                        placeholder="Bu boyutun açıklaması..."
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'categoryTable': {
                const catStep = editedStep as CategoryTableStep;
                const colorOptions = [
                    { value: 'emerald', label: '🟢 Zümrüt Yeşili (Farz vb.)' },
                    { value: 'amber', label: '🟡 Kehribar Sarısı (Vacip vb.)' },
                    { value: 'indigo', label: '🔵 İndigo Mavisi (Sünnet vb.)' },
                    { value: 'rose', label: '🔴 Gül Pembesi / Kırmızı' },
                    { value: 'cyan', label: '🩵 Turkuaz / Camgöbeği' },
                    { value: 'fuchsia', label: '🟣 Fuşya / Mor' },
                ];

                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                    📊 Tablo / Sınıflandırma Başlığı
                                </Label>
                                <Input
                                    value={catStep.tableTitle || ''}
                                    onChange={(e) => handleValueChange('tableTitle', e.target.value)}
                                    className="bg-slate-950 border-white/10 text-white font-semibold"
                                    placeholder="Örn: Hükümlerine Göre Namazlar"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    📝 Kısa Açıklama (Opsiyonel)
                                </Label>
                                <Input
                                    value={catStep.description || ''}
                                    onChange={(e) => handleValueChange('description', e.target.value)}
                                    className="bg-slate-950 border-white/10 text-white font-semibold"
                                    placeholder="Örn: Namazlar farz, vacip ve sünnet olarak 3 gruba ayrılır."
                                />
                            </div>
                        </div>

                        {/* Kategoriler (Sütunlar) */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    🏷️ Kategori Sütunları ({catStep.categories?.length || 0})
                                </Label>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        const newCol: CategoryTableColumn = {
                                            name: `Yeni Kategori ${(catStep.categories || []).length + 1}`,
                                            badge: 'Hüküm',
                                            color: ['emerald', 'amber', 'indigo', 'rose', 'cyan', 'fuchsia'][(catStep.categories || []).length % 6],
                                            items: ['Örnek madde 1', 'Örnek madde 2']
                                        };
                                        setEditedStep(prev => ({
                                            ...(prev as any),
                                            categories: [...((prev as any)?.categories || []), newCol]
                                        }));
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                                >
                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Kategori Sütunu Ekle
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {(catStep.categories || []).map((cat, catIdx) => (
                                    <div key={`cat-col-${catIdx}`} className="p-3.5 rounded-2xl bg-slate-900 border-2 border-white/10 flex flex-col justify-between space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <Input
                                                    value={cat.name}
                                                    onChange={e => {
                                                        const updated = [...(catStep.categories || [])];
                                                        updated[catIdx] = { ...updated[catIdx], name: e.target.value };
                                                        handleValueChange('categories', updated);
                                                    }}
                                                    className="bg-slate-950 border-white/20 font-black text-sm text-white flex-1"
                                                    placeholder="Kategori Adı (Örn: Farz Namazlar)"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        const updated = (catStep.categories || []).filter((_, i) => i !== catIdx);
                                                        handleValueChange('categories', updated);
                                                    }}
                                                    className="h-8 w-8 text-slate-400 hover:text-rose-400 flex-shrink-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <Input
                                                    value={cat.badge || ''}
                                                    onChange={e => {
                                                        const updated = [...(catStep.categories || [])];
                                                        updated[catIdx] = { ...updated[catIdx], badge: e.target.value };
                                                        handleValueChange('categories', updated);
                                                    }}
                                                    className="bg-slate-950 border-white/10 text-xs font-bold text-amber-300"
                                                    placeholder="Rozet (Örn: Kesin Emir)"
                                                />

                                                <Select
                                                    value={cat.color || 'emerald'}
                                                    onValueChange={val => {
                                                        const updated = [...(catStep.categories || [])];
                                                        updated[catIdx] = { ...updated[catIdx], color: val };
                                                        handleValueChange('categories', updated);
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-slate-950 border-white/10 text-xs h-9">
                                                        <SelectValue placeholder="Renk" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                                                        {colorOptions.map(opt => (
                                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Bu Kategorinin Maddeleri */}
                                            <div className="space-y-1.5 pt-2 border-t border-white/10">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-bold text-slate-400">Maddeler ({cat.items?.length || 0})</span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            const updated = [...(catStep.categories || [])];
                                                            updated[catIdx] = {
                                                                ...updated[catIdx],
                                                                items: [...(updated[catIdx].items || []), 'Yeni Madde...']
                                                            };
                                                            handleValueChange('categories', updated);
                                                        }}
                                                        className="h-6 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold"
                                                    >
                                                        + Madde Ekle
                                                    </Button>
                                                </div>

                                                {(cat.items || []).map((item, itemIdx) => (
                                                    <div key={`cat-${catIdx}-item-${itemIdx}`} className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-mono text-slate-500 w-4">{itemIdx + 1}.</span>
                                                        <Input
                                                            value={item}
                                                            onChange={e => {
                                                                const updated = [...(catStep.categories || [])];
                                                                const newItems = [...(updated[catIdx].items || [])];
                                                                newItems[itemIdx] = e.target.value;
                                                                updated[catIdx] = { ...updated[catIdx], items: newItems };
                                                                handleValueChange('categories', updated);
                                                            }}
                                                            className="bg-slate-950 border-white/10 text-xs py-1 h-8 flex-1 text-slate-200"
                                                            placeholder="Madde metni..."
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                const updated = [...(catStep.categories || [])];
                                                                updated[catIdx] = {
                                                                    ...updated[catIdx],
                                                                    items: (updated[catIdx].items || []).filter((_, i) => i !== itemIdx)
                                                                };
                                                                handleValueChange('categories', updated);
                                                            }}
                                                            className="h-6 w-6 text-slate-500 hover:text-rose-400 flex-shrink-0"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            }

            case 'objectiveList':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-300">Öğrenme Hedefleri Listesi</Label>
                            <Button size="sm" onClick={() => addToArray('items')} className="bg-yellow-600 hover:bg-yellow-500 text-slate-950 font-bold text-xs">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Hedef Ekle
                            </Button>
                        </div>
                        {((editedStep as ObjectiveListStep).items || []).map((item, index) => (
                            <div key={`obj-${index}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-white/10">
                                <span className="w-6 text-center text-xs font-mono font-bold text-yellow-400">{index + 1}.</span>
                                <Input 
                                    value={item} 
                                    onChange={e => handleArrayChange('items', index, null, e.target.value)} 
                                    className="bg-slate-950 border-white/10 flex-1"
                                    placeholder="Örn: Bu derste adaletin önemini kavrar."
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('items', index)} className="text-slate-400 hover:text-rose-400">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                );

            case 'conceptExplanation':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-300">Kavram & Tanım Listesi</Label>
                            <Button size="sm" onClick={() => addToArray('items')} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Kavram Ekle
                            </Button>
                        </div>
                        {((editedStep as ConceptExplanationStep).items || []).map((item: any, index: number) => (
                            <div key={`concept-${index}`} className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-400 font-mono">Kavram #{index + 1}</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeFromArray('items', index)} className="text-rose-400 hover:text-rose-300 h-7 text-xs">
                                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                                    </Button>
                                </div>
                                <Input 
                                    value={item.concept || ''} 
                                    onChange={e => handleArrayChange('items', index, 'concept', e.target.value)} 
                                    placeholder="Kavram / Terim Adı (Örn: Adalet)" 
                                    className="bg-slate-950 border-white/10 font-bold"
                                />
                                <Textarea 
                                    value={item.definition || ''} 
                                    onChange={e => handleArrayChange('items', index, 'definition', e.target.value)} 
                                    placeholder="Kavramın açıklaması / tanımı..." 
                                    className="bg-slate-950 border-white/10 min-h-[70px] text-sm"
                                />
                            </div>
                        ))}
                    </div>
                );

            case 'flashcard':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-300">Bilgi Kartları</Label>
                            <Button size="sm" onClick={() => addToArray('cards')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Kart Ekle
                            </Button>
                        </div>
                        {((editedStep as FlashcardStep).cards || []).map((card: any, index: number) => (
                            <div key={`flashcard-${index}`} className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-emerald-400 font-mono">Kart #{index + 1}</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeFromArray('cards', index)} className="text-rose-400 hover:text-rose-300 h-7 text-xs">
                                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                                    </Button>
                                </div>
                                <Input 
                                    value={card.term || ''} 
                                    onChange={e => handleArrayChange('cards', index, 'term', e.target.value)} 
                                    placeholder="Ön Yüz (Terim / Soru)" 
                                    className="bg-slate-950 border-white/10 font-bold"
                                />
                                <Textarea 
                                    value={card.definition || ''} 
                                    onChange={e => handleArrayChange('cards', index, 'definition', e.target.value)} 
                                    placeholder="Arka Yüz (Tanım / Cevap)" 
                                    className="bg-slate-950 border-white/10 min-h-[70px] text-sm"
                                />
                            </div>
                        ))}
                    </div>
                );

            case 'matching':
            case 'conceptMatching':
                return (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
                            <div>
                                <Label className="text-sm font-black text-white flex items-center gap-2">
                                    <Shuffle className="w-4 h-4 text-indigo-400" /> Kavram - Tanım Eşleştirme Çiftleri
                                </Label>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Öğrenciler sunumda sol sütundaki kavramlarla sağ sütundaki tanımları eşleştirecektir.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <Button 
                                    type="button" 
                                    size="sm" 
                                    onClick={handleAutoLoadMatchingFromTopic}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black rounded-lg shadow-md shadow-indigo-950/40"
                                >
                                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Veri Bankasından Çek
                                </Button>
                                <Button size="sm" onClick={() => addToArray('pairs')} className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold rounded-lg">
                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Çift Ekle
                                </Button>
                            </div>
                        </div>

                        {((editedStep as any).pairs || []).map((pair: any, index: number) => (
                            <div key={`matching-${index}`} className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3 relative group">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-400 font-mono flex items-center gap-1.5">
                                        <span className="h-5 w-5 rounded-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[11px] font-black">{index + 1}</span>
                                        Eşleşme Çifti
                                    </span>
                                    <Button variant="ghost" size="sm" onClick={() => removeFromArray('pairs', index)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 text-xs">
                                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-1">
                                        <Label className="text-[11px] font-bold text-indigo-300 mb-1 block">Kavram / Terim</Label>
                                        <Input 
                                            value={pair.concept || pair.term || ''} 
                                            onChange={e => handleArrayChange('pairs', index, 'concept', e.target.value)} 
                                            placeholder="Örn: İhlas" 
                                            className="bg-slate-950 border-indigo-500/30 text-white font-bold placeholder:text-slate-600"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label className="text-[11px] font-bold text-slate-400 mb-1 block">Tanım / Açıklama</Label>
                                        <Textarea 
                                            value={pair.definition || ''} 
                                            onChange={e => handleArrayChange('pairs', index, 'definition', e.target.value)} 
                                            placeholder="Bu kavramın doğru tanımı..." 
                                            className="bg-slate-950 border-white/10 text-slate-200 min-h-[42px] text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'trueFalseList':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-300">Doğru / Yanlış İfadeleri</Label>
                            <Button size="sm" onClick={() => addToArray('questions')} className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> İfade Ekle
                            </Button>
                        </div>
                        {((editedStep as TrueFalseListStep).questions || []).map((q: any, index: number) => (
                            <div key={`tf-${index}`} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-white/10">
                                <span className="font-mono text-xs text-slate-500 font-bold w-6">{index + 1}.</span>
                                <Input 
                                    value={q.statement || ''} 
                                    onChange={e => handleArrayChange('questions', index, 'statement', e.target.value)} 
                                    placeholder="İfade metnini yazın..."
                                    className="flex-1 bg-slate-950 border-white/10"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleArrayChange('questions', index, 'isTrue', !q.isTrue)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border flex-shrink-0",
                                        q.isTrue 
                                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                                            : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                    )}
                                >
                                    {q.isTrue ? "✓ Doğru" : "✗ Yanlış"}
                                </button>
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('questions', index)} className="text-slate-400 hover:text-rose-400">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                );

            case 'mcq':
                const mcqStep = editedStep as McqStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Soru Metni</Label>
                            <Textarea 
                                value={mcqStep.question || ''} 
                                onChange={e => handleValueChange('question', e.target.value)} 
                                placeholder="Soru kökünü buraya yazın..."
                                className="bg-slate-950 border-white/10 min-h-[90px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold text-slate-300">Seçenekler (Doğru cevaba tıklayın)</Label>
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                        const currentOptions = mcqStep.options || [];
                                        const letter = String.fromCharCode(65 + currentOptions.length);
                                        handleValueChange('options', [...currentOptions, `Seçenek ${letter}`]);
                                    }}
                                    className="border-white/10 text-xs text-slate-300"
                                >
                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Seçenek Ekle
                                </Button>
                            </div>
                            {(mcqStep.options || []).map((opt, i) => {
                                const letter = String.fromCharCode(65 + i);
                                const isCorrect = mcqStep.correctAnswer === opt;
                                return (
                                    <div key={`mcq-opt-${i}`} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => handleValueChange('correctAnswer', opt)}
                                            className={cn(
                                                "w-9 h-9 rounded-lg font-black text-sm flex items-center justify-center transition-all cursor-pointer border flex-shrink-0",
                                                isCorrect 
                                                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md" 
                                                    : "bg-slate-950 text-slate-400 border-white/10 hover:border-emerald-500/50"
                                            )}
                                            title={isCorrect ? "Doğru Cevap" : "Doğru Cevap Yap"}
                                        >
                                            {letter}
                                        </button>
                                        <Input 
                                            value={opt} 
                                            onChange={e => {
                                                const newOpts = [...mcqStep.options];
                                                const oldVal = newOpts[i];
                                                newOpts[i] = e.target.value;
                                                handleValueChange('options', newOpts);
                                                if (mcqStep.correctAnswer === oldVal) {
                                                    handleValueChange('correctAnswer', e.target.value);
                                                }
                                            }}
                                            className="flex-1 bg-slate-950 border-white/10"
                                        />
                                        {(mcqStep.options.length > 2) && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                    const newOpts = mcqStep.options.filter((_, idx) => idx !== i);
                                                    handleValueChange('options', newOpts);
                                                    if (mcqStep.correctAnswer === opt && newOpts.length > 0) {
                                                        handleValueChange('correctAnswer', newOpts[0]);
                                                    }
                                                }}
                                                className="text-slate-400 hover:text-rose-400"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            case 'tf':
                const tfStep = editedStep as TfStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">İfade Metni</Label>
                            <Textarea 
                                value={tfStep.statement || ''} 
                                onChange={e => handleValueChange('statement', e.target.value)} 
                                placeholder="Doğru/Yanlış ifadesini yazın..."
                                className="bg-slate-950 border-white/10 min-h-[90px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Doğru Cevap</Label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleValueChange('isTrue', true)}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center gap-2",
                                        tfStep.isTrue 
                                            ? "bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950" 
                                            : "bg-slate-900 text-slate-400 border-white/10 hover:bg-slate-800"
                                    )}
                                >
                                    <CheckCircle2 className="w-5 h-5" /> Doğru
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleValueChange('isTrue', false)}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center gap-2",
                                        !tfStep.isTrue 
                                            ? "bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-950" 
                                            : "bg-slate-900 text-slate-400 border-white/10 hover:bg-slate-800"
                                    )}
                                >
                                    <XCircle className="w-5 h-5" /> Yanlış
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'fitb':
                const fitbStep = editedStep as FitbStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Boşluklu Cümle</Label>
                            <Textarea 
                                value={fitbStep.sentenceWithBlank || ''} 
                                onChange={e => handleValueChange('sentenceWithBlank', e.target.value)} 
                                placeholder="Örn: İslam'ın ilk şartı _____ getirmektir."
                                className="bg-slate-950 border-white/10 min-h-[90px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Doğru Cevap</Label>
                            <Input 
                                value={fitbStep.correctAnswer || ''} 
                                onChange={e => handleValueChange('correctAnswer', e.target.value)} 
                                placeholder="Boşluğa gelecek kelime..."
                                className="bg-slate-950 border-white/10 font-bold text-purple-300"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Çeldirici Seçenekler (Virgülle ayırın)</Label>
                            <Input 
                                value={(fitbStep.options || []).join(', ')} 
                                onChange={e => handleValueChange('options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                                placeholder="Örn: Namaz, Oruç, Zekat, Kelime-i Şehadet"
                                className="bg-slate-950 border-white/10 text-xs"
                            />
                        </div>
                    </div>
                );

            case 'sentenceScramble':
                const scrambleStep = editedStep as SentenceScrambleStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Doğru Cümle</Label>
                            <Textarea 
                                value={scrambleStep.correctSentence || ''} 
                                onChange={e => {
                                    const newCorrect = e.target.value;
                                    const newScrambled = newCorrect.split(' ').sort(() => Math.random() - 0.5).join(' ');
                                    handleValueChange('correctSentence', newCorrect);
                                    handleValueChange('scrambledSentence', newScrambled);
                                }} 
                                placeholder="Öğrencinin düzelteceği doğru cümleyi girin..."
                                className="bg-slate-950 border-white/10 min-h-[90px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-slate-400">Karışık Hali (Otomatik Üretilir)</Label>
                            <Input 
                                value={scrambleStep.scrambledSentence || ''} 
                                readOnly 
                                disabled 
                                className="bg-slate-900 border-white/10 text-cyan-300 font-mono text-xs"
                            />
                        </div>
                    </div>
                );

            case 'anagramGame':
            case 'anagramFlashcard':
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-300">Kelime / Anagram Kartları</Label>
                            <Button size="sm" onClick={() => addToArray('cards')} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Kelime Ekle
                            </Button>
                        </div>
                        {((editedStep as any).cards || []).map((card: any, index: number) => (
                            <div key={`anagram-card-${index}`} className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-fuchsia-400 font-mono">Kelime #{index + 1}</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeFromArray('cards', index)} className="text-rose-400 hover:text-rose-300 h-7 text-xs">
                                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                                    </Button>
                                </div>
                                <Textarea 
                                    value={card.definition || ''} 
                                    onChange={e => handleArrayChange('cards', index, 'definition', e.target.value)} 
                                    placeholder="İpucu veya tanım..." 
                                    className="bg-slate-950 border-white/10 min-h-[60px] text-sm"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-[11px] text-slate-400 mb-1 block">Doğru Cevap</Label>
                                        <Input 
                                            value={card.correctAnswer || ''} 
                                            onChange={e => {
                                                const cleanWord = cleanForAnagram(e.target.value);
                                                const newScrambled = cleanWord.replace(/\s/g, '').split('').sort(() => Math.random() - 0.5).join('').toLocaleUpperCase('tr-TR');
                                                handleArrayChange('cards', index, 'correctAnswer', cleanWord);
                                                handleArrayChange('cards', index, 'scrambledWord', newScrambled);
                                            }} 
                                            placeholder="Doğru kelime"
                                            className="bg-slate-950 border-white/10 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[11px] text-slate-400 mb-1 block">Karışık Hali (Otomatik)</Label>
                                        <Input 
                                            value={card.scrambledWord || ''} 
                                            readOnly 
                                            disabled 
                                            className="bg-slate-900 border-white/10 font-mono text-fuchsia-300 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );

            case 'visual':
                const visualStep = editedStep as VisualStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Görsel URL Bağlantısı</Label>
                            <Input 
                                value={visualStep.imageUrl || ''} 
                                onChange={e => handleValueChange('imageUrl', e.target.value)} 
                                placeholder="https://... (Görsel bağlantısı)"
                                className="bg-slate-950 border-white/10"
                            />
                        </div>
                        {visualStep.imageUrl && (
                            <div className="relative aspect-video max-h-48 rounded-xl overflow-hidden border border-white/10 bg-slate-900">
                                <img src={visualStep.imageUrl} alt="Önizleme" className="w-full h-full object-contain" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Açıklama / Alt Yazı (İsteğe Bağlı)</Label>
                            <Input 
                                value={visualStep.caption || ''} 
                                onChange={e => handleValueChange('caption', e.target.value)} 
                                placeholder="Görselin altında gösterilecek açıklama..."
                                className="bg-slate-950 border-white/10"
                            />
                        </div>
                    </div>
                );

            case 'video':
                const videoStep = editedStep as VideoStep;
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Video Bağlantısı (YouTube / Vimeo / MP4)</Label>
                            <Input 
                                value={videoStep.url || ''} 
                                onChange={e => handleValueChange('url', e.target.value)} 
                                placeholder="https://www.youtube.com/watch?v=... veya embed URL"
                                className="bg-slate-950 border-white/10 font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-300">Video Açıklaması (İsteğe Bağlı)</Label>
                            <Textarea 
                                value={videoStep.description || ''} 
                                onChange={e => handleValueChange('description', e.target.value)} 
                                placeholder="Video ile ilgili notlar..."
                                className="bg-slate-950 border-white/10 min-h-[70px]"
                            />
                        </div>
                    </div>
                );

            case 'htmlSlide': {
                const htmlStep = editedStep as HtmlSlideStep;
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-bold text-slate-300">İnteraktif HTML Slayt Kodu</Label>
                                {htmlStep.htmlContent && (
                                    <span className="text-[10px] text-sky-300 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono">
                                        {htmlStep.htmlContent.length} karakter
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHtmlPreviewActive(v => !v)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                    isHtmlPreviewActive
                                        ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300"
                                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                )}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                {isHtmlPreviewActive ? "Canlı Önizleme Açık" : "Önizlemeyi Aç"}
                            </button>
                        </div>

                        <div className={cn("rounded-2xl border border-white/10 overflow-hidden bg-slate-950/80 flex", isHtmlPreviewActive ? "divide-x divide-white/10" : "")}>
                            {/* Kod Editörü */}
                            <div className={cn("flex flex-col", isHtmlPreviewActive ? "w-1/2" : "w-full")}>
                                <div className="px-3 py-2 bg-slate-900/60 border-b border-white/5 flex items-center justify-between">
                                    <span className="text-[11px] font-mono text-slate-400">HTML & CSS & JS Kodu</span>
                                </div>
                                <Textarea 
                                    value={htmlStep.htmlContent || ''} 
                                    onChange={e => handleValueChange('htmlContent', e.target.value)} 
                                    className="min-h-[420px] h-[420px] font-mono text-xs bg-slate-950 border-0 text-slate-200 leading-relaxed resize-none p-4 focus-visible:ring-0 rounded-none"
                                    placeholder="<!DOCTYPE html> veya <div> tam HTML slayt içeriğinizi buraya yazın..."
                                />
                            </div>

                            {/* Canlı Önizleme */}
                            {isHtmlPreviewActive && (
                                <div className="w-1/2 flex flex-col bg-slate-900/30">
                                    <div className="px-3 py-2 bg-slate-900/60 border-b border-white/5 flex items-center gap-2">
                                        <span className="text-[11px] font-mono text-slate-400">Canlı Önizleme</span>
                                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                    </div>
                                    {htmlStep.htmlContent ? (
                                        <iframe
                                            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;display:flex;flex-direction:column;justify-content:center;min-height:100vh;box-sizing:border-box}*{box-sizing:border-box}</style></head><body>${htmlStep.htmlContent}</body></html>`}
                                            className="w-full min-h-[420px] h-[420px] bg-slate-950 border-0"
                                            sandbox="allow-scripts allow-same-origin"
                                            title="Slayt Önizleme"
                                        />
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center min-h-[420px] text-slate-500 text-xs text-center p-6">
                                            <div>
                                                <Eye className="h-10 w-10 mx-auto mb-3 opacity-30 text-indigo-400" />
                                                <p className="font-semibold text-slate-300">HTML kodu yazdıkça</p>
                                                <p className="text-slate-500 text-[11px]">burada canlı olarak slayt önizlemesi görüntülenecektir.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }

            case 'iframe':
                const iframeStep = editedStep as IframeStep;
                return (
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-300">Dış Web Sayfası / Simülasyon URL</Label>
                        <Input 
                            value={iframeStep.url || ''} 
                            onChange={e => handleValueChange('url', e.target.value)} 
                            placeholder="https://..."
                            className="bg-slate-950 border-white/10 font-mono text-xs"
                        />
                    </div>
                );

            case 'activityLink':
                const actLinkStep = editedStep as any;
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-400 leading-relaxed">
                            Bu etkinlik adımı, sorularını veya kavramlarını seçtiğiniz konunun veri bankasından dinamik olarak çeker.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-400">Ders</Label>
                                <Select 
                                    value={actLinkStep.courseId || ''} 
                                    onValueChange={(val) => setEditedStep({ ...editedStep, courseId: val, unitId: '', topicId: '' } as any)}
                                >
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-xs">
                                        <SelectValue placeholder="Ders Seç" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/15 text-white">
                                        {allCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-400">Ünite</Label>
                                <Select 
                                    value={actLinkStep.unitId || ''} 
                                    onValueChange={(val) => setEditedStep({ ...editedStep, unitId: val, topicId: '' } as any)} 
                                    disabled={!selectedCourseData}
                                >
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-xs">
                                        <SelectValue placeholder="Ünite Seç" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/15 text-white">
                                        {selectedCourseData?.units.map(u => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-400">Konu</Label>
                                <Select 
                                    value={actLinkStep.topicId || ''} 
                                    onValueChange={(val) => setEditedStep({ ...editedStep, topicId: val } as any)} 
                                    disabled={!selectedUnitData}
                                >
                                    <SelectTrigger className="bg-slate-950 border-white/10 text-xs">
                                        <SelectValue placeholder="Konu Seç" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/15 text-white">
                                        {selectedUnitData?.topics?.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                );

            case 'accordion':
                const accordionStep = editedStep as AccordionStep;
                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-bold text-slate-300">Akordiyon Maddeleri</Label>
                            <Button size="sm" onClick={() => addToArray('items')} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Madde Ekle
                            </Button>
                        </div>
                        {(accordionStep.items || []).map((item: any, index: number) => (
                            <div key={`acc-${index}`} className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-400 font-mono">Madde #{index + 1}</span>
                                    <Button variant="ghost" size="sm" onClick={() => removeFromArray('items', index)} className="text-rose-400 hover:text-rose-300 h-7 text-xs">
                                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Sil
                                    </Button>
                                </div>
                                <Input 
                                    value={item.title || ''} 
                                    onChange={e => handleArrayChange('items', index, 'title', e.target.value)} 
                                    placeholder="Başlık..." 
                                    className="bg-slate-950 border-white/10 font-bold"
                                />
                                <Textarea 
                                    value={item.content || ''} 
                                    onChange={e => handleArrayChange('items', index, 'content', e.target.value)} 
                                    placeholder="İçerik..." 
                                    className="bg-slate-950 border-white/10 min-h-[70px] text-sm"
                                />
                            </div>
                        ))}
                    </div>
                );

            default:
                return (
                    <div className="p-4 rounded-xl bg-slate-900 text-slate-400 text-sm">
                        Bu adım türü için özel alan tanımlanmadı.
                    </div>
                );
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-5xl w-[95vw] md:w-[90vw] lg:max-w-5xl h-[92vh] max-h-[92vh] flex flex-col p-0 bg-slate-950 border border-white/10 text-slate-100 shadow-2xl rounded-3xl overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400 shadow-md">
                                <FileEdit className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                    {(step as any)?.id && !(step as any).id.startsWith('new-') ? 'Adımı Düzenle' : 'Yeni Adım Ekle'}
                                </DialogTitle>
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                                    Tür: <strong className="text-indigo-300">{editedStep.type}</strong>
                                </span>
                            </div>
                        </div>

                        {libraryConfig?.enabled && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsLibraryOpen(true)} 
                                className="border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-600/20 bg-indigo-950/40 text-xs font-bold rounded-xl mr-6"
                            >
                                <Library className="mr-1.5 h-3.5 w-3.5" /> Veri Bankasından Seç
                            </Button>
                        )}
                    </DialogHeader>

                    {/* ══ AI İLE ADIMI DÜZENLE & GELİŞTİR ÇUBUĞU ══ */}
                    <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-purple-950/80 border-b border-white/10 p-3 sm:px-6 space-y-2 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="p-1 bg-yellow-500/20 rounded-lg text-yellow-300 border border-yellow-500/30">
                                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                                </span>
                                <span className="text-xs font-black text-white">
                                    Yapay Zekâ ile Bu Adımı Düzenle / Geliştir
                                </span>
                                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                    Kaynak Metne Sadık AI
                                </span>
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsAiRefineOpen(!isAiRefineOpen)}
                                className="h-6 px-2 text-[11px] text-indigo-300 hover:text-white"
                            >
                                {isAiRefineOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </Button>
                        </div>

                        {isAiRefineOpen && (
                            <div className="space-y-2 animate-in fade-in-50 duration-200">
                                <div className="flex gap-2">
                                    <Input
                                        value={aiRefinePrompt}
                                        onChange={(e) => setAiRefinePrompt(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAiRefine();
                                            }
                                        }}
                                        placeholder="Bu adımda neyi değiştirmek istersiniz? (Örn: Maddeleri sadeleştir, 2 yeni soru ekle, çeldiricileri zorlaştır, aşamaları detaylandır)..."
                                        className="bg-slate-950/90 border-white/15 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl flex-1"
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => handleAiRefine()}
                                        disabled={isAiRefining || !aiRefinePrompt.trim()}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs h-9 px-4 rounded-xl shadow-md shadow-purple-950/50 flex-shrink-0 cursor-pointer disabled:opacity-40"
                                    >
                                        {isAiRefining ? (
                                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Düzenleniyor...</>
                                        ) : (
                                            <><Send className="w-3.5 h-3.5 mr-1.5" /> AI ile Güncelle</>
                                        )}
                                    </Button>
                                </div>

                                {/* Hızlı Öneri Butonları */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                                    {[
                                        "Maddeleri kısalt ve daha akılda kalıcı yap",
                                        "Daha detaylı ve açıklayıcı hale getir",
                                        "1 adet daha madde / soru ekle",
                                        "Dili 6-8. sınıf seviyesine sadeleştir",
                                        "Soruları ve çeldiricileri biraz daha zorlaştır",
                                    ].map((sug, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                setAiRefinePrompt(sug);
                                                handleAiRefine(sug);
                                            }}
                                            className="px-2 py-0.5 rounded-full bg-slate-950/70 hover:bg-indigo-950 border border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white text-[10px] font-medium whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
                                        >
                                            ✨ {sug}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Body */}
                    <ScrollArea className="flex-1 px-6 py-5">
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="step-title" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Adım Başlığı
                                </Label>
                                <Input 
                                    id="step-title" 
                                    value={editedStep.title || ''} 
                                    onChange={(e) => handleValueChange('title', e.target.value)} 
                                    className="bg-slate-950 border-white/10 h-11 text-base font-bold text-white focus:border-indigo-500"
                                    placeholder="Örn: 1. Konu Anlatımı veya Anahtar Kavramlar"
                                />
                            </div>

                            {renderEditorFields()}
                        </div>
                    </ScrollArea>
                    
                    {/* Footer */}
                    <DialogFooter className="p-4 px-6 border-t border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between sm:justify-between">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl">
                                İptal
                            </Button>
                        </DialogClose>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={isSaving || !isDirty} 
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black px-7 rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-40"
                        >
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} 
                            Değişiklikleri Kaydet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {libraryConfig && (
                <LibraryImportDialog 
                    isOpen={isLibraryOpen}
                    onOpenChange={setIsLibraryOpen}
                    onItemsSelected={(handleSelectFromLibrary as any)}
                    context={context || {}}
                    config={libraryConfig as any}
                />
            )}
        </>
    );
}
