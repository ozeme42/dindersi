'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { LessonStep, ActivityItem, Question, Topic, GenerateLessonContentInput, VideoStep, ObjectiveListStep, ConceptExplanationStep, TrueFalseListStep } from '@/lib/types';
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
import { type GenerateLessonContentOutput } from '@/ai/flows/generate-lesson-content';
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type DraggableLessonStep = LessonStep & { id: string };

// --- STEP CARD COMPONENT (Modernized) ---
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
        position: 'relative' as 'relative', // Type assertion for position
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
            case 'video': return <span className="text-xs text-rose-400/80 truncate block max-w-[200px]">{(step as VideoStep).url}</span>;
            default: return null;
        }
    }

    return (
        <div ref={setNodeRef} style={style} className="group">
            <Card className="bg-slate-900/50 backdrop-blur-sm border-white/5 hover:border-white/10 transition-all hover:shadow-lg overflow-hidden">
                <div className="flex items-center p-3 gap-3">
                    {/* Drag Handle */}
                    <button 
                        className="touch-none p-1.5 hover:bg-white/5 rounded text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing transition-colors"
                        {...listeners} {...attributes}
                    >
                        <Grip className="h-5 w-5" />
                    </button>

                    {/* Order & Icon */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-400 text-xs font-bold font-mono">
                            {order}
                        </span>
                        <div className="p-2 rounded-lg bg-slate-800/50 border border-white/5">
                            {getIcon()}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-200 truncate">{step.title}</h4>
                        <div className="mt-1">
                            {renderContentPreview()}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {step.type === 'accordion' && onSplit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-500/20 hover:text-blue-400" onClick={onSplit} title="Adımlara Ayır">
                                <LayersIcon className="h-4 w-4" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-500/20 hover:text-emerald-400" onClick={onEdit}>
                            <FilePenLine className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400" onClick={onDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

function TopicEditor() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    
    const [topic, setTopic] = useState<Topic | null>(null);
    const [steps, setSteps] = useState<DraggableLessonStep[]>([]);
    const [sourceText, setSourceText] = useState('');
    const [htmlContent, setHtmlContent] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<{ step: LessonStep; index: number } | null>(null);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
    const [libraryConfig, setLibraryConfig] = useState<{ filter: (ActivityItem['type'] | 'questions')[]; multiSelect: boolean; stepType: LessonStep['type'] | 'keyConcepts' | 'questions'; }>({ filter: [], multiSelect: false, stepType: 'content' });
    const { toast } = useToast();
    
    const [isAiStepDialogOpen, setIsAiStepDialogOpen] = useState(false);
    const [aiModuleToGenerate, setAiModuleToGenerate] = useState<keyof GenerateLessonContentInput['modules'] | 'conceptMap' | 'htmlSlide' | null>(null);

    const addIdToSteps = (steps: LessonStep[]): DraggableLessonStep[] => {
        return steps.map(step => ({ ...step, id: `step-${Math.random().toString(36).substr(2, 9)}` }));
    };

    useEffect(() => {
        const fetchTopicData = async () => {
            if (!courseId || !unitId || !topicId) return;
            setIsLoading(true);
            const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            const topicSnap = await getDoc(topicRef);
            if (topicSnap.exists()) {
                const topicData = { id: topicSnap.id, ...topicSnap.data() } as Topic;
                setTopic(topicData);
                setSteps(addIdToSteps(topicData.steps || []));
                setSourceText(topicData.sourceText || '');
                setHtmlContent(topicData.htmlContent || '');
            } else {
                toast({ title: "Hata", description: "Konu bulunamadı.", variant: "destructive" });
            }
            setIsLoading(false);
        }
        fetchTopicData();
    }, [courseId, unitId, topicId, toast]);
    
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
            case 'htmlSlide': newStep = { type, title: defaultTitle, htmlContent: '<!DOCTYPE html>\n<html lang="tr">\n<head>\n  <title>Başlık</title>\n</head>\n<body>\n  <h1>Merhaba Dünya</h1>\n</body>\n</html>' }; break;
            case 'video': newStep = { type, title: defaultTitle, url: 'https://www.youtube.com/embed/...' }; break;
            case 'activityLink': return; // Needs a dropdown to select, so handled separately.
            case 'conceptMap': newStep = { type, title: defaultTitle, mapData: { nodes: [], edges: [] } }; break;
            case 'accordion': newStep = { type, title: 'Akordiyon Başlık', items: [{ title: 'Başlık 1', content: 'İçerik 1'}] }; break;
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
    
    const handleOpenLibrary = (filter: (ActivityItem['type'] | 'questions')[], multiSelect: boolean, stepType: LessonStep['type'] | 'keyConcepts' | 'questions') => {
        setLibraryConfig({ filter, multiSelect, stepType });
        setIsLibraryPanelOpen(true);
    };

    const handleItemsImportedFromLibrary = (importedItems: (ActivityItem | Question)[], stepType: LessonStep['type'] | 'keyConcepts' | 'questions') => {
        let newSteps: LessonStep[] = [];
        
        switch (stepType) {
            case 'flashcard':
                newSteps.push({
                    type: 'flashcard',
                    title: 'Bilgi Kartları (Veri Bankası)',
                    cards: (importedItems as ActivityItem[]).map(item => ({
                        term: item.content.term || '',
                        definition: item.content.definition || '',
                    }))
                });
                break;
            case 'anagramFlashcard':
                newSteps.push({
                    type: 'anagramFlashcard',
                    title: 'Anagram Kartları (Veri Bankası)',
                    cards: (importedItems as ActivityItem[]).map(item => ({
                        definition: `İpucu: Bu kelime "${item.content.text}"`,
                        scrambledWord: (item.content.text || '').split('').sort(() => 0.5 - Math.random()).join('').toLocaleUpperCase('tr-TR'),
                        correctAnswer: item.content.text || ''
                    }))
                });
                break;
            case 'sentenceScramble':
                newSteps = (importedItems as ActivityItem[]).map(item => ({
                    type: 'sentenceScramble',
                    title: 'Cümle Düzeltme (Veri Bankası)',
                    correctSentence: item.content.text || '',
                    scrambledSentence: (item.content.text || '').split(' ').sort(() => 0.5 - Math.random()).join(' ')
                }));
                break;
            case 'keyConcepts':
                 newSteps.push({
                    type: 'content',
                    title: 'Anahtar Kavramlar (Veri Bankası)',
                    content: "<ul>" + (importedItems as ActivityItem[]).map(item => `<li>${item.content.text}</li>`).join('') + "</ul>"
                });
                break;
            case 'questions':
                newSteps = (importedItems as Question[]).map(q => {
                    switch (q.type) {
                        case 'Çoktan Seçmeli':
                            return { type: 'mcq', title: q.text, question: q.text, options: q.options || [], correctAnswer: q.correctAnswer || '' };
                        case 'Doğru/Yanlış':
                            return { type: 'tf', title: q.text, statement: q.text, isTrue: q.correctAnswer === 'Doğru' || q.isTrue || false };
                        case 'Boşluk Doldurma':
                            return { type: 'fitb', title: q.text, sentenceWithBlank: q.text, options: q.options || [], correctAnswer: q.correctAnswer || '' };
                        default:
                            return null;
                    }
                }).filter((s): s is LessonStep => s !== null);
                break;
        }

        if (newSteps.length > 0) {
            const newStepsWithIds = addIdToSteps(newSteps);
            setSteps(currentSteps => [...currentSteps, ...newStepsWithIds]);
            toast({
                title: "İçerik Eklendi!",
                description: `${newSteps.length} yeni adım kütüphaneden eklendi.`,
            });
        }
    };


    const handleSplitStep = (indexToSplit: number) => {
        const stepToSplit = steps[indexToSplit];
        if (stepToSplit.type !== 'accordion') return;

        const accordionStep = stepToSplit as AccordionStep;
        const newContentSteps: LessonStep[] = accordionStep.items.map(item => ({
            type: 'content',
            title: item.title,
            content: item.content,
        }));
        
        const newStepsWithIds = addIdToSteps(newContentSteps);

        setSteps(currentSteps => {
            const newSteps = [...currentSteps];
            newSteps.splice(indexToSplit, 1, ...newStepsWithIds);
            return newSteps;
        });

        toast({
            title: "Adım Ayrıldı",
            description: `Akordiyon, ${newContentSteps.length} ayrı içerik adımına bölündü.`,
        });
    };

    const handleSave = async () => {
        if (!courseId || !unitId || !topicId) return;
        setIsSaving(true);
        
        const stepsToSave = steps.map(({ id, ...rest }) => rest);

        const result = await updateTopicContent({ 
            courseId, 
            unitId, 
            topicId, 
            steps: stepsToSave, 
            sourceText,
            htmlContent,
        });
        if(result.success) {
            toast({ title: "Başarılı", description: "Konu içeriği başarıyla güncellendi." });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsSaving(false);
    };

    const mapAIOutputToSteps = (output: GenerateLessonContentOutput): LessonStep[] => {
        const newSteps: LessonStep[] = [];
        if (output.summary && output.summary.length > 0) {
            newSteps.push({
                type: 'accordion',
                title: 'Konu Özeti',
                items: output.summary.map(item => ({ title: item.title, content: item.content }))
            });
        }
        if (output.learningObjectives && output.learningObjectives.length > 0) {
            newSteps.push({ type: 'objectiveList', title: 'Öğrenme Hedefleri', items: output.learningObjectives });
        }
        if (output.keyTakeaways && output.keyTakeaways.length > 0) {
            newSteps.push({ type: 'objectiveList', title: 'Bu Konuda Öğrendiklerimiz', items: output.keyTakeaways });
        }
        if (output.keyConcepts && output.keyConcepts.length > 0) {
            newSteps.push({ type: 'content', title: 'Anahtar Kavramlar', content: "<ul>" + output.keyConcepts.map(c => `<li>${c}</li>`).join('') + "</ul>" });
        }
        if (output.conceptExplanations && output.conceptExplanations.length > 0) {
            newSteps.push({ type: 'conceptExplanation', title: 'Kavram Açıklamaları', items: output.conceptExplanations });
        }
        if (output.flashcards && output.flashcards.length > 0) {
            newSteps.push({ type: 'flashcard', title: 'Bilgi Kartları', cards: output.flashcards });
        }
        if(output.generatedImageDataUri) {
            newSteps.push({ type: 'visual', title: 'Ana Görsel', imageUrl: output.generatedImageDataUri });
        }
        if (output.infographicIdeas && output.infographicIdeas.length > 0) {
            newSteps.push({ type: 'content', title: 'İnfografik Fikirleri', content: "<ul>" + output.infographicIdeas.map(i => `<li>${i}</li>`).join('') + "</ul>" });
        }
        if (output.videos && output.videos.length > 0) {
            newSteps.push({ type: 'content', title: 'Video Fikirleri', content: "<ul>" + output.videos.map(v => `<li>${v}</li>`).join('') + "</ul>" });
        }
        if (output.documents && output.documents.length > 0) {
            newSteps.push({ type: 'content', title: 'Belge Önerileri', content: "<ul>" + output.documents.map(v => `<li>${v}</li>`).join('') + "</ul>" });
        }
        if (output.multipleChoiceQuestions && output.multipleChoiceQuestions.length > 0) {
            output.multipleChoiceQuestions.forEach(q => {
                newSteps.push({ type: 'mcq', title: 'Çoktan Seçmeli', question: q.question, options: q.options, correctAnswer: q.correctAnswer });
            });
        }
        if (output.trueFalseQuestions && output.trueFalseQuestions.length > 0) {
             newSteps.push({
                type: 'trueFalseList',
                title: 'Doğru/Yanlış Alıştırması',
                questions: output.trueFalseQuestions
            });
        }
        if (output.fillInTheBlankQuestions && output.fillInTheBlankQuestions.length > 0) {
            output.fillInTheBlankQuestions.forEach(q => {
                newSteps.push({ type: 'fitb', title: 'Boşluk Doldurma', sentenceWithBlank: q.sentenceWithBlank, options: q.options, correctAnswer: q.correctAnswer });
            });
        }
        if (output.anagramQuestions && output.anagramQuestions.length > 0) {
            newSteps.push({ type: 'anagramFlashcard', title: 'Anagram Bilgi Kartları', cards: output.anagramQuestions });
        }
        if (output.sentenceScrambleQuestions && output.sentenceScrambleQuestions.length > 0) {
            output.sentenceScrambleQuestions.forEach(q => {
                newSteps.push({ type: 'sentenceScramble', title: 'Cümle Düzeltme', scrambledSentence: q.scrambledSentence, correctSentence: q.correctSentence });
            });
        }

        return newSteps;
    }

    const handleGenerateStep = (moduleId: keyof GenerateLessonContentInput['modules']) => {
        if (!topic) return;
        setAiModuleToGenerate(moduleId);
        setIsAiStepDialogOpen(true);
    };
    
    const handleGenerateConceptMap = () => {
        if (!topic) return;
        setAiModuleToGenerate('conceptMap');
        setIsAiStepDialogOpen(true);
    };
    
    const handleGenerateHtmlSlide = () => {
        if (!topic) return;
        setAiModuleToGenerate('htmlSlide');
        setIsAiStepDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!topic) {
        return <div className="text-center text-muted-foreground p-8">Konu yüklenemedi.</div>
    }

    const anlatimStepOptions: {label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void}[] = [
        { label: 'Metin İçeriği', type: 'content', defaultTitle: 'Metin İçeriği' },
        { label: 'Öğrenme Hedefleri', type: 'objectiveList', defaultTitle: 'Bu Konuda Öğreneceklerimiz' },
        { label: 'Kavram Açıklamaları', type: 'conceptExplanation', defaultTitle: 'Kavram Açıklamaları' },
        { label: 'Anahtar Kavramlar (Veri Bankası)', action: () => handleOpenLibrary(['concept'], true, 'keyConcepts') },
        { label: 'Akordiyon Özet', type: 'accordion', defaultTitle: 'Konu Özeti' },
        { label: 'Bilgi Kartları (Veri Bankası)', action: () => handleOpenLibrary(['definition'], true, 'flashcard') },
        { label: 'Görsel / Afiş', type: 'visual', defaultTitle: 'Görsel' },
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
    
    const aiGenerationOptions = [
        { label: 'Özet (Akordiyon)', moduleId: 'summary' },
        { label: 'Öğrenme Hedefleri', moduleId: 'learningObjectives' },
        { label: 'Öğrendiklerimiz (Liste)', moduleId: 'keyTakeaways' },
        { label: 'Kavram Açıklamaları', moduleId: 'conceptExplanations' },
        { label: 'Anahtar Kavramlar', moduleId: 'keyConcepts' },
        { label: 'Bilgi Kartları', moduleId: 'flashcards' },
        { label: 'AI ile Görsel Oluştur', moduleId: 'visuals' },
      ] as const;

    const aiAssessmentOptions = [
        { label: 'Çoktan Seçmeli Sorular', moduleId: 'multipleChoiceQuestions' },
        { label: 'Doğru/Yanlış Soruları', moduleId: 'trueFalseQuestions' },
        { label: 'Boşluk Doldurma Soruları', moduleId: 'fillInTheBlankQuestions' },
        { label: 'Anagram Soruları (Kart Formatında)', moduleId: 'anagramQuestions' },
        { label: 'Cümle Düzeltme Soruları', moduleId: 'sentenceScrambleQuestions' },
    ] as const;

    const playableActivities = [
      { href: 'bil-bakalim', label: 'Bil Bakalım', icon: Lightbulb },
      { href: 'eslestirme', label: 'Eşleştirme', icon: Puzzle },
      { href: 'hafiza-kartlari', label: 'Hafıza Kartları', icon: Layers },
      { href: 'adam-asmaca', label: 'Adam Asmaca', icon: Skull },
      { href: 'kavram-avi', label: 'Kavram Avı', icon: Crosshair },
      { href: 'kelime-avi', label: 'Kelime Avı', icon: Search },
      { href: 'hedefi-vur', label: 'Hedefi Vur', icon: MousePointerClick },
      { href: 'cumle-olusturma', label: 'Cümle Oluşturma', icon: Shuffle },
      { href: 'kategorilere-ayir', label: 'Kategorize Et', icon: FolderKanban },
      { href: 'milyoner-yarismasi', label: 'Milyoner', icon: Trophy },
      { href: 'soru-coz', label: 'Soru Çöz', icon: BrainCircuit },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            
            {/* Arka Plan */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 border-b border-white/5 pb-6">
                    <div>
                        <Button asChild variant="ghost" size="sm" className="mb-2 text-slate-400 hover:text-white hover:bg-white/10">
                            <Link href="/teacher/content-creation">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                İçerik Yönetimine Dön
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase drop-shadow-md">{topic.title}</h1>
                        <p className="text-slate-400">Konu içeriğini ve adımlarını buradan yönetin.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                          <Button variant="secondary" onClick={() => setIsPreviewOpen(true)} className="bg-slate-800 text-white hover:bg-slate-700">
                            <Eye className="mr-2 h-4 w-4" />
                            Önizle
                        </Button>
                        <Button variant="outline" onClick={() => setIsLibraryPanelOpen(true)} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                            <Library className="mr-2 h-4 w-4"/>
                            Kütüphane
                        </Button>
                        <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                            <Upload className="mr-2 h-4 w-4"/>
                            Toplu Ekle
                        </Button>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-900/20">
                                    <Sparkles className="mr-2 h-4 w-4"/>
                                    AI ile Üret
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="focus:bg-white/10 focus:text-white">Anlatım</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="bg-slate-900 border-white/10 text-white">
                                        {aiGenerationOptions.map(opt => (
                                            <DropdownMenuItem key={opt.moduleId} onClick={() => handleGenerateStep(opt.moduleId as any)} className="focus:bg-white/10 focus:text-white">{opt.label}</DropdownMenuItem>
                                        ))}
                                        <DropdownMenuItem onClick={handleGenerateHtmlSlide} className="focus:bg-white/10 focus:text-white">
                                            <LayoutTemplate className="mr-2 h-4 w-4"/> AI ile Slayt Sayfası
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="focus:bg-white/10 focus:text-white">Değerlendirme</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent className="bg-slate-900 border-white/10 text-white">
                                         {aiAssessmentOptions.map(opt => {
                                            const moduleId = opt.moduleId === 'anagramFlashcard' ? 'anagramQuestions' : opt.moduleId;
                                            return (
                                                <DropdownMenuItem key={opt.moduleId} onClick={() => handleGenerateStep(moduleId as any)} className="focus:bg-white/10 focus:text-white">
                                                    {opt.label}
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => handleGenerateConceptMap()} className="focus:bg-white/10 focus:text-white">
                                    <BrainCircuit className="mr-2 h-4 w-4"/> Kavram Haritası
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
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
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>

                {/* Ders Akışı Yönetimi */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                            <Layers className="h-6 w-6 text-purple-400" /> Ders Akışı
                        </h2>
                        <div className="flex gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                                        <BookOpen className="mr-2 h-4 w-4" /> Anlatım Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
                                    {anlatimStepOptions.map(opt => <DropdownMenuItem key={opt.label} onClick={() => opt.action ? opt.action() : handleAddStep(opt.type!, opt.defaultTitle!)} className="focus:bg-white/10 focus:text-white">{opt.label}</DropdownMenuItem>)}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                                        <Brain className="mr-2 h-4 w-4" /> Değerlendirme Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
                                    {degerlendirmeStepOptions.map(opt => <DropdownMenuItem key={opt.label} onClick={() => opt.action ? opt.action() : handleAddStep(opt.type!, opt.defaultTitle!)} className="focus:bg-white/10 focus:text-white">{opt.label}</DropdownMenuItem>)}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                                        <Gamepad2 className="mr-2 h-4 w-4" /> Etkinlik Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
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
                                        }} className="focus:bg-white/10 focus:text-white">{act.label}</DropdownMenuItem>
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
                <AiLessonStepGenerationDialog
                    isOpen={isAiStepDialogOpen}
                    onOpenChange={setIsAiStepDialogOpen}
                    context={topic ? { topicId: topic.id, topicTitle: topic.title, sourceText: sourceText } : null}
                    moduleToGenerate={aiModuleToGenerate}
                    onStepsGenerated={handleAddSteps}
                    mapAIOutputToSteps={mapAIOutputToSteps}
                />
            </div>
        </div>
    );
}

export default function TopicEditorPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <TopicEditor />
        </Suspense>
    )
}