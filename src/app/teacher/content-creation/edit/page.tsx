
'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { LessonStep, ActivityItem, Question, Topic, GenerateLessonContentInput, VideoStep, ObjectiveListStep, ConceptExplanationStep, AccordionStep, IframeStep, ImageAsset } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Loader2, PlusCircle, Brain, BookOpen, Trash2, Save, ArrowLeft, Sparkles, 
    FilePenLine, Eye, Upload, Library, Gamepad2, Search, Crosshair, Shuffle, 
    Lightbulb, Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Trophy, 
    BrainCircuit, Grip, LayoutTemplate, LayersIcon, Link as LinkIcon, 
    Video, FileText, Image as ImageIcon, GraduationCap, HelpCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateTopicContent } from './actions';
import Link from 'next/link';
import Image from "next/image";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, 
    DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { StepEditorDialog } from '@/components/step-editor-dialog';
import { LessonPreviewDialog } from '@/components/lesson-preview-dialog';
import { BulkStepImportDialog } from '@/components/bulk-step-import-dialog';
import { LibraryImportDialog } from '@/components/library-import-dialog';
import type { GenerateLessonContentOutput } from '@/ai/flows/generate-lesson-content';
import { generateLessonContent } from '@/ai/flows/generate-lesson-content';
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { playableActivities } from '@/lib/game-config';
import React from 'react';
import { Input } from '@/components/ui/input';


type DraggableLessonStep = LessonStep & { id: string };

// --- STEP CARD COMPONENT (Updated Colors) ---
function StepCard({ step, order, onEdit, onDelete, onSplit, id }: { 
    step: LessonStep; 
    order: number;
    id: string;
    onEdit: () => void; 
    onDelete: () => void;
    onSplit?: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as 'relative',
    };

    const getIcon = () => {
        switch (step.type) {
            case 'video': return <Video className="w-5 h-5 text-rose-400" />;
            case 'visual': return <ImageIcon className="w-5 h-5 text-emerald-400" />;
            case 'content': return <FileText className="w-5 h-5 text-blue-400" />;
            case 'objectiveList': return <GraduationCap className="w-5 h-5 text-yellow-400" />;
            case 'mcq': case 'tf': case 'fitb': return <HelpCircle className="w-5 h-5 text-purple-400" />;
            case 'game': case 'activityLink': return <Gamepad2 className="w-5 h-5 text-orange-400" />;
            default: return <BookOpen className="w-5 h-5 text-slate-400" />;
        }
    };

    const renderContentPreview = () => {
         switch (step.type) {
            case 'content': return <div className="line-clamp-2 text-xs text-slate-400" dangerouslySetInnerHTML={{ __html: step.content }} />;
            case 'objectiveList': return <span className="text-xs text-yellow-400/80">{(step as ObjectiveListStep).items.length} hedef</span>;
            case 'conceptExplanation': return <span className="text-xs text-blue-400/80">{(step as ConceptExplanationStep).items.length} kavram</span>;
            case 'mcq': return <span className="text-xs text-purple-400/80 italic">{step.question}</span>;
            case 'tf': return <span className="text-xs text-purple-400/80 italic">{step.statement}</span>;
            case 'fitb': return <span className="text-xs text-purple-400/80 italic">{step.sentenceWithBlank}</span>;
            case 'flashcard': return <span className="text-xs text-emerald-400/80">{step.cards.length} kart</span>;
            case 'anagram': return <span className="text-xs text-orange-400/80 font-mono">{step.scrambledWord}</span>;
            case 'visual': return step.imageUrl ? <div className="relative h-12 w-20 rounded overflow-hidden border border-white/10"><Image src={step.imageUrl} alt={step.title} fill className="object-cover" /></div> : <span className="text-xs text-slate-500">Görsel yok</span>;
            case 'video': return <span className="text-xs text-rose-400/80 truncate block max-w-[200px]">{step.url}</span>;
            default: return null;
        }
    }

    return (
        <div ref={setNodeRef} style={style} className="group">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-white/5 hover:border-white/20 transition-all hover:shadow-lg overflow-hidden group-hover:bg-slate-800/80">
                <div className="flex items-center p-3 gap-3">
                    {/* Drag Handle */}
                    <button 
                        className="touch-none p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white cursor-grab active:cursor-grabbing transition-colors"
                        {...listeners} {...attributes}
                    >
                        <Grip className="h-5 w-5" />
                    </button>

                    {/* Order & Icon */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-950 text-slate-500 text-xs font-bold font-mono border border-white/5">
                            {order}
                        </span>
                        <div className="p-2 rounded-lg bg-slate-950 border border-white/5">
                            {getIcon()}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-200 truncate group-hover:text-white transition-colors">{step.title}</h4>
                        <div className="mt-1">
                            {renderContentPreview()}
                        </div>
                    </div>

                    {/* Actions - Always visible on mobile, hover on desktop */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {step.type === 'accordion' && onSplit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400" onClick={onSplit} title="Adımlara Ayır">
                                <LayersIcon className="h-4 w-4" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400" onClick={onEdit}>
                            <FilePenLine className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-red-500/20 hover:text-red-400" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export function TopicEditor({ 
    initialTopic, 
    courseId, 
    unitId, 
    topicId: topicIdProp, 
    onSave, 
    isSaving,
    isUnitFlow = false,
    onOpenAIGeneration
}: { 
    initialTopic: Topic | null,
    courseId: string,
    unitId: string,
    topicId?: string | null,
    onSave: (steps: LessonStep[], title?: string, sourceText?: string) => Promise<void>,
    isSaving: boolean,
    isUnitFlow?: boolean,
    onOpenAIGeneration?: (type: 'anlatim' | 'degerlendirme') => void;
}) {
    const topicId = isUnitFlow ? null : (topicIdProp || initialTopic?.id);
    
    const [title, setTitle] = useState(initialTopic?.title || '');
    const [steps, setSteps] = useState<DraggableLessonStep[]>([]);
    const [sourceText, setSourceText] = useState(initialTopic?.sourceText || '');
    const [htmlContent, setHtmlContent] = useState(initialTopic?.htmlContent || '');
    
    const [isLoading, setIsLoading] = useState(!initialTopic);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<{ step: LessonStep; index: number } | null>(null);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
    const [libraryConfig, setLibraryConfig] = useState<{ filter: (ActivityItem['type'] | 'questions' | 'images')[]; multiSelect: boolean; stepType: LessonStep['type'] | 'keyConcepts' | 'questions'; }>({ filter: [], multiSelect: false, stepType: 'content' });
    const { toast } = useToast();

    const addIdToSteps = (steps: LessonStep[]): DraggableLessonStep[] => {
        return steps.map(step => ({ ...step, id: `step-${Math.random().toString(36).substr(2, 9)}` }));
    };

    useEffect(() => {
        if (initialTopic) {
            setTitle(initialTopic.title);
            setSteps(addIdToSteps(initialTopic.steps || []));
            setSourceText(initialTopic.sourceText || '');
            setHtmlContent(initialTopic.htmlContent || '');
            setIsLoading(false);
        } else {
             const fetchTopicData = async () => {
                if (!courseId || !unitId || !topicId) return;
                setIsLoading(true);
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (topicSnap.exists()) {
                    const topicData = { id: topicSnap.id, ...topicSnap.data() } as Topic;
                    setTitle(topicData.title);
                    setSteps(addIdToSteps(topicData.steps || []));
                    setSourceText(topicData.sourceText || '');
                    setHtmlContent(topicData.htmlContent || '');
                } else {
                    toast({ title: "Hata", description: "Konu bulunamadı.", variant: "destructive" });
                }
                setIsLoading(false);
            }
            fetchTopicData();
        }
    }, [initialTopic, courseId, unitId, topicId, toast]);
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = steps.findIndex((step) => step.id === active.id);
            const newIndex = steps.findIndex((step) => step.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                setSteps((items) => arrayMove(items, oldIndex, newIndex));
            }
        }
    };

    const handleAddStep = (type: LessonStep['type'], defaultTitle: string) => {
        let newStep: LessonStep;

        switch(type) {
            case 'content': newStep = { type, title: defaultTitle, content: 'İçeriği buraya girin...' }; break;
            case 'objectiveList': newStep = { type, title: defaultTitle, items: ['Yeni hedef...'] }; break;
            case 'conceptExplanation': newStep = { type, title: defaultTitle, items: [{ concept: "Kavram 1", definition: "Tanım 1"}] }; break;
            case 'flashcard': newStep = { type, title: defaultTitle, cards: [{ term: 'Terim', definition: 'Tanım' }] }; break;
            case 'visual': newStep = { type, title: defaultTitle, imageUrl: 'https://placehold.co/600x400.png' }; break;
            case 'mcq': newStep = { type, title: defaultTitle, question: 'Soru?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A' }; break;
            case 'tf': newStep = { type, title: defaultTitle, statement: 'Bu ifade doğru mu?', isTrue: true }; break;
            case 'trueFalseList': newStep = { type, title: defaultTitle, questions: [{ statement: 'Yeni ifade...', isTrue: true}] }; break;
            case 'fitb': newStep = { type, title: defaultTitle, sentenceWithBlank: 'Boşluğu ___ doldurun.', options: ['Cevap A', 'Cevap B', 'Cevap C', 'Cevap D'], correctAnswer: 'Cevap A' }; break;
            case 'anagram': newStep = { type, title: defaultTitle, definition: "Doğru kelime için bir ipucu veya tanım.", scrambledWord: 'gnamara', correctAnswer: 'anagram' }; break;
            case 'anagramFlashcard': newStep = { type, title: defaultTitle, cards: [{ definition: 'İpucu', scrambledWord: 'AKARNA', correctAnswer: 'ANKARA' }] }; break;
            case 'sentenceScramble': newStep = { type, title: defaultTitle, scrambledSentence: 'bir bu cümledir karışık', correctSentence: 'bu bir karışık cümledir' }; break;
            case 'iframe': newStep = { type, title: defaultTitle, url: 'https://phet.colorado.edu/tr/simulations/list' }; break;
            case 'htmlSlide': newStep = { type, title: defaultTitle, htmlContent: '<!DOCTYPE html>\\n<html lang="tr">\\n<head>\\n  <title>Başlık</title>\\n</head>\\n<body>\\n  <h1>Merhaba Dünya</h1>\\n</body>\\n</html>' }; break;
            case 'video': newStep = { type, title: defaultTitle, url: 'https://www.youtube.com/embed/...' }; break;
            case 'activityLink': return;
            case 'conceptMap': newStep = { type: 'conceptMap', 'title': 'Kavram Haritası', mapData: { nodes: [], edges: [] } }; break;
            case 'accordion': newStep = { type: 'accordion', title: 'Akordiyon Başlık', items: [{ title: 'Başlık 1', content: 'İçerik 1'}] }; break;
            default: return;
        }

        const newStepWithId: DraggableLessonStep = { ...newStep, id: `new-step-${Date.now()}` };
        setSteps(currentSteps => [...currentSteps, newStepWithId]);
    };

    const handleDeleteStep = (stepIndex: number) => {
        setSteps(currentSteps => currentSteps.filter((_, index) => index !== stepIndex));
    };

    const handleOpenEditor = (index: number) => {
        setEditingStep({ step: steps[index], index });
    };

    const handleUpdateStep = (updatedStep: LessonStep) => {
        if (editingStep === null) return;
        setSteps(currentSteps => {
            const newSteps = [...currentSteps];
            newSteps[editingStep.index] = { ...updatedStep, id: newSteps[editingStep.index].id };
            return newSteps;
        });
        setEditingStep(null); // Close dialog
        toast({ title: "Adım Güncellendi", description: "Değişikliklerin kalıcı olması için ana 'Değişiklikleri Kaydet' butonuna basmayı unutmayın." });
    };
    
    const handleAddSteps = (newSteps: LessonStep[]) => {
        const newStepsWithIds = addIdToSteps(newSteps);
        setSteps(currentSteps => [...currentSteps, ...newStepsWithIds]);
        toast({
            title: "İçerik Eklendi!",
            description: `${newSteps.length} yeni adım akışa eklendi.`,
        });
    };
    
    const handleOpenLibrary = (filter: (ActivityItem['type'] | 'questions' | 'images')[];, multiSelect: boolean, stepType: LessonStep['type'] | 'keyConcepts' | 'questions') => {
        setLibraryConfig({ filter, multiSelect, stepType });
        setIsLibraryPanelOpen(true);
    };

    const handleItemsImportedFromLibrary = (importedItems: (ActivityItem | Question | ImageAsset)[], stepType: LessonStep['type'] | 'keyConcepts' | 'questions') => {
        if (importedItems.length === 0) return;
        
        let newSteps: LessonStep[] = [];
        
        if (stepType === 'visual' && config.filter.includes('images')) {
             newSteps = importedItems.map(item => ({
                type: 'visual',
                title: (item as ImageAsset).title || 'Arşivden Görsel',
                imageUrl: (item as ImageAsset).url
            }));
        } else if (stepType === 'flashcard') {
            const cards = importedItems.map(item => ({ term: (item as ActivityItem).content.term || '', definition: (item as ActivityItem).content.definition || ''}));
            newSteps.push({ type: 'flashcard', title: 'Veri Bankası Bilgi Kartları', cards: cards });
        } else if (stepType === 'anagramFlashcard') {
            const cards = importedItems.map(item => ({
                definition: `İpucu: Bu kelime "${(item as ActivityItem).content.text}"`,
                scrambledWord: ((item as ActivityItem).content.text || '').split('').sort(() => 0.5 - Math.random()).join('').toLocaleUpperCase('tr-TR'),
                correctAnswer: (item as ActivityItem).content.text || ''
            }));
             newSteps.push({ type: 'anagramFlashcard', title: 'Veri Bankası Anagram Kartları', cards: cards });
        } else if (stepType === 'sentenceScramble') {
             const newSentence = (importedItems[0] as ActivityItem)?.content.text || '';
             newSteps.push({
                type: 'sentenceScramble',
                title: 'Cümle Düzeltme',
                correctSentence: newSentence,
                scrambledSentence: newSentence.split(' ').sort(() => 0.5 - Math.random()).join(' ')
            });
        } else if (stepType === 'keyConcepts') {
             const concepts = importedItems.map(item => `<li>${(item as ActivityItem).content.text}</li>`).join('');
             newSteps.push({ type: 'content', title: 'Anahtar Kavramlar', content: `<ul>${concepts}</ul>` });
        } else if (stepType === 'questions') {
            importedItems.forEach(item => {
                const q = item as Question;
                if (q.type === 'Çoktan Seçmeli') newSteps.push({ type: 'mcq', title: q.text, ...q });
                else if (q.type === 'Doğru/Yanlış') newSteps.push({ type: 'tf', title: q.text, statement: q.text, isTrue: q.correctAnswer === 'Doğru' });
                else if (q.type === 'Boşluk Doldurma') newSteps.push({ type: 'fitb', title: q.text, sentenceWithBlank: q.text, options: q.options || [], correctAnswer: q.correctAnswer || '' });
            });
        }

        if (newSteps.length > 0) {
            handleAddSteps(newSteps);
        }
    };
    
    const handleSplitStep = (indexToSplit: number) => {
        const stepToSplit = steps[indexToSplit];
        if (stepToSplit.type !== 'accordion') return;
        
        const accordionStep = stepToSplit as AccordionStep;
        
        if (accordionStep.items && accordionStep.items.length > 0) {
            const newContentSteps: LessonStep[] = accordionStep.items.map(item => ({
                type: 'content',
                title: item.title,
                content: item.content
            }));
            const newStepsWithIds = addIdToSteps(newContentSteps);
            setSteps(currentSteps => {
                const newSteps = [...currentSteps];
                newSteps.splice(indexToSplit, 1, ...newStepsWithIds);
                return newSteps;
            });
        }
    };
    
    const handleSaveFlow = async () => {
        const stepsToSave = steps.map(({ id, ...rest }) => rest);
        if (isUnitFlow) {
            onSave(stepsToSave, title, sourceText);
        } else {
             if (!courseId || !unitId || !topicId) return;
            const result = await updateTopicContent({ courseId, unitId, topicId, steps: stepsToSave, sourceText, htmlContent });
            if(result.success) { toast({ title: "Başarılı", description: "Konu içeriği başarıyla güncellendi." }); } 
            else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
            </div>
        );
    }

    const anlatimStepOptions: {label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void}[] = [
        { label: 'Metin İçeriği', type: 'content', defaultTitle: 'Metin İçeriği' },
        { label: 'Öğrenme Hedefleri', type: 'objectiveList', defaultTitle: 'Bu Konuda Öğreneceklerimiz' },
        { label: 'Kavram Açıklamaları', type: 'conceptExplanation', defaultTitle: 'Kavram Açıklamaları' },
        { label: 'Anahtar Kavramlar (Veri Bankası)', action: () => handleOpenLibrary(['concept'], true, 'keyConcepts') },
        { label: 'Akordiyon Özet', type: 'accordion', defaultTitle: 'Konu Özeti' },
        { label: 'Bilgi Kartları (Veri Bankası)', action: () => handleOpenLibrary(['definition'], true, 'flashcard') },
        { label: 'Görsel (Arşivden)', action: () => handleOpenLibrary(['images'], false, 'visual') },
        { label: 'Video', type: 'video', defaultTitle: 'Video' },
        { label: 'Diyagram / Şema', type: 'visual', defaultTitle: 'Diyagram' },
        { label: 'İnfografik', type: 'visual', defaultTitle: 'İnfografik' },
        { label: 'Kavram Haritası', type: 'conceptMap', defaultTitle: 'Kavram Haritası' },
        { label: 'Dış Sayfa / Simülasyon', type: 'iframe', defaultTitle: 'İnteraktif Etkinlik' },
        { label: 'İnteraktif HTML Sayfası', type: 'htmlSlide', defaultTitle: 'İnteraktif Sunum' },
    ];
    const degerlendirmeStepOptions: {label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void}[] = [
        { label: 'Çoktan Seçmeli', type: 'mcq', defaultTitle: 'Çoktan Seçmeli Soru' },
        { label: 'Doğru/Yanlış', type: 'tf', defaultTitle: 'Doğru/Yanlış' },
        { label: 'Doğru/Yanlış Listesi', type: 'trueFalseList', defaultTitle: 'Doğru/Yanlış Alıştırması' },
        { label: 'Boşluk Doldurma', type: 'fitb', defaultTitle: 'Boşluk Doldurma' },
        { label: 'Anagram', type: 'anagram', defaultTitle: 'Anagram' },
        { label: 'Anagram Kartları (Veri Bankası)', action: () => handleOpenLibrary(['concept'], true, 'anagramFlashcard') },
        { label: 'Cümle Düzeltme (Veri Bankası)', action: () => handleOpenLibrary(['sentence'], true, 'sentenceScramble') },
        { label: 'Soru Bankasından Soru Ekle', action: () => handleOpenLibrary(['questions'], true, 'questions') },
    ];

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-white/5 pb-6">
                     <div className="flex items-start gap-4">
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-xl h-12 w-12 flex-shrink-0">
                            <Link href="/teacher/content-creation">
                                <ArrowLeft className="h-6 w-6" />
                            </Link>
                        </Button>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md bg-transparent border-0 h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                        <p className="text-slate-400 font-medium">{isUnitFlow ? 'Ünite' : 'Konu'} içeriğini ve adımlarını buradan yönetin.</p>
                     </div>
                     <div className="flex gap-2 flex-wrap self-end sm:self-center">
                          <Button variant="secondary" onClick={() => setIsPreviewOpen(true)} className="bg-slate-800 text-white hover:bg-slate-700 border border-white/10 shadow-lg">
                            <Eye className="mr-2 h-4 w-4" />
                            Önizle
                        </Button>
                        <Button variant="outline" onClick={() => setIsLibraryPanelOpen(true)} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                            <Library className="mr-2 h-4 w-4"/>
                            Kütüphane
                        </Button>
                        <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent">
                            <Upload className="mr-2 h-4 w-4"/>
                            Toplu Ekle
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-900/20">
                                    <Sparkles className="mr-2 h-4 w-4"/> AI ile Üret
                                </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent className="bg-slate-900 border-white/10 text-white w-56">
                                <DropdownMenuItem onClick={() => onOpenAIGeneration?.('anlatim')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    <FileText className="mr-2 h-4 w-4 text-blue-400"/> Anlatım Adımları Üret
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onOpenAIGeneration?.('degerlendirme')} className="focus:bg-white/10 focus:text-white cursor-pointer">
                                    <HelpCircle className="mr-2 h-4 w-4 text-purple-400"/> Değerlendirme Adımları Üret
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={handleSaveFlow} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-900/20">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Kaydet
                        </Button>
                    </div>
                </div>

                {/* Kaynak İçerik Alanı */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden rounded-2xl">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="source-text" className="border-b-0">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-lg font-bold text-white">Kaynak ve İçerik</span>
                                        <span className="text-xs text-slate-400 font-normal">Yapay zeka ve öğrenci paneli için temel metinler.</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-2 space-y-6 bg-slate-950/30">
                                <div>
                                    <Label htmlFor="source-text" className="text-slate-300 font-semibold mb-2 block">Kaynak Metin (Yapay Zeka için)</Label>
                                    <Textarea 
                                        id="source-text"
                                        value={sourceText} 
                                        onChange={(e) => setSourceText(e.target.value)}
                                        placeholder="Konuyla ilgili temel bilgileri, özet metni veya anahtar kelimeleri buraya girin..."
                                        className="min-h-[120px] text-base bg-slate-950 border-white/10 text-white focus:border-indigo-500/50"
                                    />
                                </div>
                                {!isUnitFlow && (
                                    <div className="border-t border-white/5 pt-6">
                                        <Label htmlFor="htmlContent" className="text-slate-300 font-semibold mb-2 block">İnteraktif HTML İçeriği (Öğrenci Paneli için)</Label>
                                        <Textarea 
                                            id="htmlContent"
                                            value={htmlContent} 
                                            onChange={(e) => setHtmlContent(e.target.value)}
                                            placeholder="Konu detay sayfasında gösterilecek tam HTML kodunu buraya yapıştırın..."
                                            className="min-h-[300px] font-mono text-xs bg-slate-950 border-white/10 text-slate-300 focus:border-indigo-500/50"
                                        />
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>

                {/* Ders Akışı Yönetimi */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 gap-4">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            <Layers className="h-6 w-6 text-purple-400" /> Ders Akışı
                        </h2>
                        <div className="flex gap-2 flex-wrap">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-300 hover:text-blue-100 hover:bg-blue-500/20 bg-blue-950/20">
                                        <BookOpen className="mr-2 h-4 w-4" /> Anlatım Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-900 border-white/10 text-white w-56">
                                    {anlatimStepOptions.map(opt => <DropdownMenuItem key={opt.label} onClick={() => opt.action ? opt.action() : handleAddStep(opt.type!, opt.defaultTitle!)} className="focus:bg-white/10 focus:text-white cursor-pointer">{opt.label}</DropdownMenuItem>)}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-300 hover:text-purple-100 hover:bg-purple-500/20 bg-purple-950/20">
                                        <Brain className="mr-2 h-4 w-4" /> Değerlendirme Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-900 border-white/10 text-white w-56">
                                    {degerlendirmeStepOptions.map(opt => <DropdownMenuItem key={opt.label} onClick={() => opt.action ? opt.action() : handleAddStep(opt.type!, opt.defaultTitle!)} className="focus:bg-white/10 focus:text-white cursor-pointer">{opt.label}</DropdownMenuItem>)}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-orange-500/30 text-orange-300 hover:text-orange-100 hover:bg-orange-500/20 bg-orange-950/20">
                                        <Gamepad2 className="mr-2 h-4 w-4" /> Etkinlik Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-900 border-white/10 text-white w-56">
                                    {playableActivities.map(act => (
                                        <DropdownMenuItem key={act.href} onClick={() => {
                                            const newStep = {
                                                type: 'activityLink',
                                                title: `${act.label} Etkinliği`,
                                                activityType: act.href,
                                                activityLabel: act.label,
                                            } as any;
                                            const newStepWithId: DraggableLessonStep = { ...newStep, id: `new-step-${Date.now()}` };
                                            setSteps(currentSteps => [...currentSteps, newStepWithId]);
                                        }} className="focus:bg-white/10 focus:text-white cursor-pointer">{act.label}</DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3 pb-20">
                                {steps.length > 0 ? (
                                    steps.map((step, index) => (
                                        <StepCard 
                                            key={step.id} 
                                            id={step.id}
                                            order={index + 1}
                                            step={step} 
                                            onEdit={() => handleOpenEditor(index)} 
                                            onDelete={() => handleDeleteStep(index)}
                                            onSplit={step.type === 'accordion' ? () => handleSplitStep(index) : undefined}
                                        />
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50 text-slate-500">
                                        <PlusCircle className="h-16 w-16 mb-4 opacity-20" />
                                        <p className="text-xl font-bold">Henüz adım eklenmemiş.</p>
                                        <p className="text-sm">Yukarıdaki butonları kullanarak içerik eklemeye başlayın.</p>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Dialoglar */}
                <BulkStepImportDialog 
                    isOpen={isBulkImportOpen}
                    onOpenChange={setIsBulkImportOpen}
                    onImport={handleAddSteps}
                />
                <LibraryImportDialog 
                    isOpen={isLibraryPanelOpen}
                    onOpenChange={setIsLibraryPanelOpen}
                    onItemsSelected={handleItemsImportedFromLibrary}
                    context={{ courseId, unitId, topicId }}
                    config={libraryConfig}
                />
                <StepEditorDialog 
                    isOpen={!!editingStep} 
                    onOpenChange={(isOpen) => !isOpen && setEditingStep(null)}
                    step={editingStep?.step ?? null}
                    onSave={handleUpdateStep}
                    context={{ courseId, unitId, topicId }}
                />
                <LessonPreviewDialog 
                    isOpen={isPreviewOpen}
                    onOpenChange={setIsPreviewOpen}
                    steps={steps}
                />
            </div>
        </div>
    );
}

// Wrapper component to handle Suspense
function TopicEditorWrapper() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const { toast } = useToast();

    // This is a topic editor, so it needs a topicId.
    useEffect(() => {
        if (!topicId) {
            toast({ title: "Hata", description: "Düzenlenecek bir konu seçilmedi.", variant: 'destructive' });
        }
    }, [topicId, toast]);

    if (!courseId || !unitId || !topicId) {
        // You can return a more user-friendly error message or a redirect component
        return <div className="flex h-screen items-center justify-center bg-slate-950 text-red-500">
            Geçersiz URL. Lütfen içerik yönetimi sayfasından bir konu seçin.
        </div>;
    }

    return (
        <TopicEditor 
            key={`${courseId}-${unitId}-${topicId}`} // Re-mount component if IDs change
            initialTopic={null}
            courseId={courseId}
            unitId={unitId}
            topicId={topicId}
            onSave={async (steps, title, sourceText) => {
                const result = await updateTopicContent({ courseId, unitId, topicId, steps, sourceText: sourceText || '' });
                if(result.success) { toast({ title: "Başarılı", description: "Konu içeriği başarıyla güncellendi." }); } 
                else { toast({ title: "Hata", description: result.error, variant: "destructive" }); }
            }}
            isSaving={false}
        />
    )
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <TopicEditorWrapper />
        </Suspense>
    )
}
