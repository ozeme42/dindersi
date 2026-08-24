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
    Video, Image as ImageIcon, FileText, HelpCircle, Gamepad2, Puzzle, Shuffle, Layers, Sparkles
} from 'lucide-react';
import type { 
    ActivityItem, LessonStep, AnagramGameStep, AnagramFlashcardStep, 
    SentenceScrambleStep, FlashcardStep, AccordionStep, ConceptExplanationStep, 
    FitbStep, IframeStep, McqStep, ObjectiveListStep, TfStep, TrueFalseListStep, 
    VideoStep, VisualStep, Question, ImageAsset, Course, Unit, Topic, SchoolClass, HtmlSlideStep 
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

    // conceptExplanation normalizasyonu
    if (normalized.type === 'conceptExplanation') {
        normalized.items = normalized.items || normalized.content?.items || [{ concept: 'Kavram', definition: 'Tanım' }];
    }
    // flashcard normalizasyonu
    if (normalized.type === 'flashcard') {
        normalized.cards = normalized.cards || [{ term: 'Terim', definition: 'Tanım' }];
    }
    // trueFalseList normalizasyonu
    if (normalized.type === 'trueFalseList') {
        normalized.questions = normalized.questions || [{ statement: 'Yeni ifade...', isTrue: true }];
    }
    // objectiveList normalizasyonu
    if (normalized.type === 'objectiveList') {
        normalized.items = normalized.items || ['Yeni hedef...'];
    }

    return normalized as LessonStep;
};

type StepEditorDialogProps = {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    step: LessonStep | null;
    onSave: (updatedStep: LessonStep) => void;
    isSaving: boolean;
    context?: { courseId?: string | null, unitId?: string | null, topicId?: string | null };
};

export function StepEditorDialog({ isOpen, onOpenChange, step, onSave, isSaving, context }: StepEditorDialogProps) {
    const [editedStep, setEditedStep] = useState<LessonStep | null>(null);
    const [initialData, setInitialData] = useState<Partial<LessonStep>>({});
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    
    const { toast } = useToast();
    const [allCourses, setAllCourses] = useState<(Course & { units: (Unit & { topics: Topic[]})[]})[]>([]);
    
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
            case 'anagramFlashcard': return { enabled: true, filter: ['concept'], multiSelect: true, stepType: 'anagramFlashcard' as const };
            case 'anagramGame': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'anagramGame' as const };
            case 'sentenceScramble': return { enabled: true, filter: ['sentence'], multiSelect: true, stepType: 'sentenceScramble' as const };
            case 'conceptExplanation': return { enabled: true, filter: ['definition'], multiSelect: true, stepType: 'keyConcepts' as const };
            default: return { enabled: false, filter: [], multiSelect: false, stepType: 'content' as const };
        }
    }, [editedStep]);

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
            const newItems = items.map(item => ({
                concept: (item as ActivityItem).content?.term || (item as ActivityItem).content?.text || 'Kavram',
                definition: (item as ActivityItem).content?.definition || ''
            }));
            setEditedStep(prev => ({ ...(prev as any), items: newItems } as ConceptExplanationStep));
        }
        setIsLibraryOpen(false);
    };

    if (!isOpen || !editedStep) return null;

    const selectedCourseData = allCourses.find(c => c.id === (editedStep as any).courseId);
    const selectedUnitData = selectedCourseData?.units.find(u => u.id === (editedStep as any).unitId);

    const [contentViewMode, setContentViewMode] = useState<'list' | 'raw'>('list');

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

                return (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm font-bold text-slate-300">
                                    {contentViewMode === 'list' ? 'Cümle & Madde Listesi (Sunumda Sırayla Ekrana Gelir)' : 'Serbest HTML / Kod Modu'}
                                </Label>
                                <p className="text-[11px] text-slate-400">
                                    {contentViewMode === 'list' 
                                        ? 'Cümleleri buradan HTML etiketleri olmadan kolayca düzenleyebilir, ekleyebilir veya silebilirsiniz.' 
                                        : 'Özel HTML veya zengin metin düzenleme.'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {contentViewMode === 'list' && (
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        onClick={() => {
                                            const updated = [...sentences, 'Yeni açıklama cümlesi...'];
                                            updateContentSentences(updated);
                                        }} 
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-8"
                                    >
                                        <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Cümle Ekle
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setContentViewMode(contentViewMode === 'list' ? 'raw' : 'list')}
                                    className="border-white/10 text-xs text-slate-300 hover:text-white rounded-xl h-8"
                                >
                                    {contentViewMode === 'list' ? '📝 Kod / HTML Modu' : '✨ Görsel Cümle Modu'}
                                </Button>
                            </div>
                        </div>

                        {contentViewMode === 'list' ? (
                            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                                {sentences.length > 0 ? (
                                    sentences.map((sentence, idx) => (
                                        <div key={`sentence-${idx}`} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-indigo-500/40 transition-colors">
                                            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1 border border-indigo-500/30">
                                                {idx + 1}
                                            </span>
                                            <Textarea
                                                value={sentence}
                                                onChange={(e) => {
                                                    const updated = [...sentences];
                                                    updated[idx] = e.target.value;
                                                    updateContentSentences(updated);
                                                }}
                                                rows={2}
                                                className="bg-slate-950 border-white/10 text-white text-xs leading-relaxed rounded-xl flex-1 resize-none min-h-[52px]"
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
                                                className="text-slate-500 hover:text-rose-400 h-8 w-8 rounded-lg mt-0.5"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-2xl bg-slate-900/40 p-4">
                                        <p className="text-xs text-slate-400 mb-3">Bu adım altında henüz cümle bulunmuyor.</p>
                                        <Button 
                                            type="button"
                                            size="sm"
                                            onClick={() => updateContentSentences(['İlk açıklama cümlesi...'])}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-xl"
                                        >
                                            <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> İlk Cümleyi Ekle
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Textarea 
                                value={currentContent} 
                                onChange={(e) => handleValueChange('content', e.target.value)} 
                                className="min-h-[260px] bg-slate-950 border-white/10 text-white font-mono text-xs leading-relaxed rounded-2xl" 
                                placeholder="Metin içeriğinizi buraya girin. HTML etiketlerini (<p>, <strong>, <ul>, <li> vb.) destekler."
                            />
                        )}
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

            case 'htmlSlide':
                const htmlStep = editedStep as HtmlSlideStep;
                return (
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-slate-300">İnteraktif HTML Slayt Kodu</Label>
                        <Textarea 
                            value={htmlStep.htmlContent || ''} 
                            onChange={e => handleValueChange('htmlContent', e.target.value)} 
                            className="min-h-[300px] font-mono text-xs bg-slate-950 border-white/10 text-slate-300 leading-relaxed"
                            placeholder="Tam HTML kodunu buraya yapıştırın..."
                        />
                    </div>
                );

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
                                        {selectedUnitData?.topics.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
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
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 bg-slate-950 border border-white/10 text-slate-100 shadow-2xl rounded-3xl overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-md flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400 shadow-md">
                                <FileEdit className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                                    {step?.id && !step.id.startsWith('new-') ? 'Adımı Düzenle' : 'Yeni Adım Ekle'}
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
                    config={libraryConfig}
                />
            )}
        </>
    );
}
