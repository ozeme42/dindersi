

"use client"
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { LessonStep, ActivityLinkStep, AccordionStep, ConceptMapStep, AnagramStep, FitbStep, McqStep, TfStep, SentenceScrambleStep, VisualStep, IframeStep, FlashcardStep, TrueFalseListStep, HtmlSlideStep, ContentStep, ConceptExplanationStep, AnagramFlashcardStep, ActivityItem, ObjectiveListStep, VideoStep, Topic } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle, Brain, BookOpen, Trash2, Save, ArrowLeft, Sparkles, FilePenLine, Eye, Upload, Library, Gamepad2, Search, Crosshair, Shuffle, Lightbulb, Puzzle, Skull, Layers, FolderKanban, MousePointerClick, Trophy, BrainCircuit, Grip, LayoutTemplate, LayersIcon, ClipboardCheck, Mic, Link as LinkIcon, Pencil, ArrowDownUp, Bug, Check, Video, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateTopicContent } from './actions';
import Link from 'next/link';
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { StepEditorDialog } from '@/components/step-editor-dialog';
import { LessonPreviewDialog } from '@/components/lesson-preview-dialog';
import { BulkStepImportDialog } from '@/components/bulk-step-import-dialog';
import { LibraryImportDialog } from '@/components/library-import-dialog';
import { generateLessonContent, type GenerateLessonContentOutput } from '@/ai/flows/generate-lesson-content';
import { generateConceptMap } from '@/ai/flows/generate-concept-map-flow';
import { generateHtmlSlide } from '@/ai/flows/generate-html-slide-flow';
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Label } from '@/components/ui/label';

type DraggableLessonStep = LessonStep & { id: string };

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
        zIndex: isDragging ? 10 : 'auto',
    };

    const renderContentPreview = () => {
         switch (step.type) {
            case 'content': return step.content;
            case 'objectiveList': return `${(step as ObjectiveListStep).items.length} hedef`;
            case 'conceptExplanation': return `${(step as ConceptExplanationStep).items.length} kavram açıklaması`;
            case 'mcq': return step.question;
            case 'tf': return step.statement;
            case 'fitb': return step.sentenceWithBlank;
            case 'flashcard': return `${step.cards.length} kart`;
            case 'anagram': return step.scrambledWord;
            case 'anagramFlashcard': return `${step.cards.length} anagram kartı`;
            case 'sentenceScramble': return step.scrambledSentence;
            case 'visual': return <Image src={step.imageUrl} alt={step.title} width={100} height={100} className="rounded-md object-cover" data-ai-hint="lesson visual" />;
            case 'iframe': return step.url;
            case 'htmlSlide': return "İnteraktif HTML Sayfası";
            case 'activityLink': return `Etkinlik: ${step.activityLabel}`;
            case 'accordion': return `${step.items.length} başlık`;
            case 'conceptMap': return `${step.mapData.nodes.length} düğüm içeren kavram haritası`;
            case 'trueFalseList': return `${(step as TrueFalseListStep).questions.length} soru`;
            case 'video': return (step as VideoStep).url;
            default: return 'İçerik...'
        }
    }

    return (
        <div ref={setNodeRef} style={style}>
            <Card className="bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-grab" {...listeners} {...attributes}>
                            <Grip className="h-4 w-4" />
                        </Button>
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{order}</span>
                        <CardTitle className="text-base font-medium truncate">{step.title}</CardTitle>
                    </div>
                    <div className="flex items-center">
                        {step.type === 'accordion' && onSplit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onSplit} title="Adımlara Ayır">
                                <LayersIcon className="h-4 w-4" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                            <FilePenLine className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground truncate">
                       {renderContentPreview()}
                    </div>
                </CardContent>
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
    
    const handleOpenLibrary = (filter: (ActivityItem['type'] | 'questions' | 'imageLibrary')[], multiSelect: boolean, stepType: LessonStep['type'] | 'keyConcepts' | 'questions') => {
        setLibraryConfig({ filter, multiSelect, stepType });
        setIsLibraryPanelOpen(true);
    };

    const handleItemsImportedFromLibrary = (importedItems: (ActivityItem | Question)[], stepType: LessonStep['type'] | 'keyConcepts' | 'questions') => {
        let newSteps: LessonStep[] = [];
        
        switch (stepType) {
            case 'visual':
                newSteps = importedItems.map(item => ({
                    type: 'visual',
                    title: item.title || 'Kütüphaneden Görsel',
                    imageUrl: item.imageUrl || '',
                }));
                break;
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
        return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    }

    if (!topic) {
        return <div className="text-center text-muted-foreground">Konu yüklenemedi.</div>
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
        { label: 'Anagram Bilgi Kartları (Veri Bankası)', action: () => handleOpenLibrary(['concept'], true, 'anagramFlashcard') },
        { label: 'Cümle Düzeltme (Veri Bankası)', action: () => handleOpenLibrary(['sentence'], true, 'sentenceScramble') },
        { label: 'Soru Bankasından Soru Ekle', action: () => handleOpenLibrary(['questions'], true, 'questions') },
    ];
    
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

    return (
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                    <Button asChild variant="outline" size="sm" className="mb-2">
                        <Link href="/teacher/content-creation">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            İçerik Yönetimine Dön
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold font-headline">{topic.title}</h1>
                    <p className="text-muted-foreground">Konu içeriğini ve adımlarını buradan yönetin.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                     <Button variant="secondary" onClick={() => setIsPreviewOpen(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Önizle
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/teacher/image-library" target="_blank">
                             <ImageIcon className="mr-2 h-4 w-4"/>
                            Görsel Kütüphanesi
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => handleOpenLibrary(['questions', 'concept', 'definition', 'sentence', 'categorization', 'sorting', 'imageLibrary'], true, 'visual')}>
                        <Library className="mr-2 h-4 w-4"/>
                        Kütüphaneden Ekle
                    </Button>
                    <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
                        <Upload className="mr-2 h-4 w-4"/>
                        Toplu Adım Ekle
                    </Button>
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Sparkles className="mr-2 h-4 w-4"/>
                                Yapay Zeka ile Adım Ekle
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Anlatım</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                    {aiGenerationOptions.map(opt => (
                                        <DropdownMenuItem key={opt.moduleId} onClick={() => handleGenerateStep(opt.moduleId as any)}>{opt.label}</DropdownMenuItem>
                                    ))}
                                    <DropdownMenuItem onClick={handleGenerateHtmlSlide}>
                                        <LayoutTemplate className="mr-2 h-4 w-4"/> AI ile Slayt Sayfası
                                    </DropdownMenuItem>
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>Değerlendirme</DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                     {aiAssessmentOptions.map(opt => {
                                        const moduleId = opt.moduleId === 'anagramFlashcard' ? 'anagramQuestions' : opt.moduleId;
                                        return (
                                            <DropdownMenuItem key={opt.moduleId} onClick={() => handleGenerateStep(moduleId as any)}>
                                                {opt.label}
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleGenerateConceptMap()}>
                                <BrainCircuit className="mr-2 h-4 w-4"/> Kavram Haritası
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Değişiklikleri Kaydet
                    </Button>
                </div>
            </div>

            <Card className="mb-6">
                <Accordion type="multiple" className="w-full">
                    <AccordionItem value="source-text" className="border-b-0">
                        <AccordionTrigger className="p-6 hover:no-underline">
                            <div className="flex-1 text-left space-y-1.5">
                                <CardTitle>Yapay Zeka ve Öğrenci Paneli İçin İçerik</CardTitle>
                                <CardDescription>
                                    Yapay zeka araçları için kaynak metin ve öğrencinin konu detay sayfasında göreceği interaktif HTML içeriği.
                                </CardDescription>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-0 space-y-4">
                            <div>
                                <Label htmlFor="source-text" className="font-semibold">Kaynak Metin (Yapay Zeka için)</Label>
                                <Textarea 
                                    id="source-text"
                                    value={sourceText} 
                                    onChange={(e) => setSourceText(e.target.value)}
                                    placeholder="Konuyla ilgili temel bilgileri, özet metni veya anahtar kelimeleri buraya girin..."
                                    className="min-h-[120px] text-base"
                                />
                            </div>
                            <div className="border-t pt-4 space-y-4">
                                <div>
                                    <Label htmlFor="htmlContent" className="font-semibold">İnteraktif HTML İçeriği (Öğrenci Paneli için)</Label>
                                    <Textarea 
                                        id="htmlContent"
                                        value={htmlContent} 
                                        onChange={(e) => setHtmlContent(e.target.value)}
                                        placeholder="Konu detay sayfasında gösterilecek tam HTML kodunu buraya yapıştırın..."
                                        className="min-h-[300px] font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </Card>

            <div className="space-y-6">
                <div className="flex justify-end gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <BookOpen className="mr-2 h-4 w-4" /> Anlatım Adımı Ekle
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {anlatimStepOptions.map(opt => <DropdownMenuItem key={opt.label} onClick={() => opt.action ? opt.action() : handleAddStep(opt.type!, opt.defaultTitle!)}>{opt.label}</DropdownMenuItem>)}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Brain className="mr-2 h-4 w-4" /> Değerlendirme Adımı Ekle
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {degerlendirmeStepOptions.map(opt => <DropdownMenuItem key={opt.label} onClick={() => opt.action ? opt.action() : handleAddStep(opt.type!, opt.defaultTitle!)}>{opt.label}</DropdownMenuItem>)}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Gamepad2 className="mr-2 h-4 w-4" /> Etkinlik Adımı Ekle
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {playableActivities.map(act => (
                                <DropdownMenuItem key={act.href} onClick={() => {
                                    const newStep: ActivityLinkStep = {
                                        type: 'activityLink',
                                        title: `${act.label} Etkinliği`,
                                        activityType: act.href,
                                        activityLabel: act.label,
                                    };
                                    const newStepWithId: DraggableLessonStep = { ...newStep, id: `new-step-${Date.now()}` };
                                    setSteps(currentSteps => [...currentSteps, newStepWithId]);
                                }}>{act.label}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Ders Akışı</CardTitle>
                                <CardDescription>Adımları tutma kollarından sürükleyerek sıralayın.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
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
                                <p className="text-sm text-center text-muted-foreground py-8">Henüz adım eklenmedi.</p>
                            )}
                            </CardContent>
                        </Card>
                    </SortableContext>
                </DndContext>
            </div>

             <BulkStepImportDialog 
                isOpen={isBulkImportOpen}
                onOpenChange={setIsBulkImportOpen}
                onImport={handleAddSteps}
             />
             <LibraryImportDialog 
                isOpen={isLibraryPanelOpen}
                onOpenChange={setIsLibraryPanelOpen}
                onItemsSelected={handleItemsImportedFromLibrary}
                context={context}
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
    );
}

export default function TopicEditorPage() {
    return (
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TopicEditor />
        </Suspense>
    )
}
