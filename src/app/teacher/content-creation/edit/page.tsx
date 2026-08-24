'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { LessonStep, Topic, AccordionStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    Loader2, PlusCircle, Brain, BookOpen, Trash2, Save, ArrowLeft, Sparkles, 
    FilePenLine, Eye, Upload, Library, Gamepad2, Shuffle, 
    Puzzle, Layers, Grip, LayersIcon, 
    Video, FileText, Image as ImageIcon, GraduationCap, HelpCircle, Database, EyeOff, 
    CheckCircle2, XCircle, Copy, ChevronUp, ChevronDown, Plus, Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateTopicContent } from './actions';
import Link from 'next/link';
import Image from "next/image";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { StepEditorDialog } from '@/components/step-editor-dialog';
import { LessonPreviewDialog } from '@/components/lesson-preview-dialog';
import { BulkStepImportDialog } from '@/components/bulk-step-import-dialog';
import { LibraryImportDialog } from '@/components/library-import-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';
import { playableActivities } from '@/lib/game-config';
import { cn, cleanForAnagram } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';

type DraggableLessonStep = LessonStep & { id: string };

// ══ ADIM KARTI BİLEŞENİ ══
function StepCard({ 
    step, 
    order, 
    id, 
    isFirst, 
    isLast,
    onEdit, 
    onDelete, 
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onSplit, 
    onTogglePublish 
}: { 
    step: LessonStep; 
    order: number;
    id: string;
    isFirst: boolean;
    isLast: boolean;
    onEdit: () => void; 
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onSplit?: () => void;
    onTogglePublish: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as 'relative',
    };

    const getTypeMeta = () => {
        switch (step.type) {
            case 'content': return { label: 'Metin', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', icon: <FileText className="w-4 h-4 text-blue-400" /> };
            case 'objectiveList': return { label: 'Hedefler', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', icon: <GraduationCap className="w-4 h-4 text-yellow-400" /> };
            case 'conceptExplanation': return { label: 'Kavramlar', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10', icon: <Brain className="w-4 h-4 text-indigo-400" /> };
            case 'flashcard': return { label: 'Bilgi Kartı', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', icon: <BookOpen className="w-4 h-4 text-emerald-400" /> };
            case 'trueFalseList': return { label: 'D/Y Listesi', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', icon: <HelpCircle className="w-4 h-4 text-purple-400" /> };
            case 'mcq': return { label: 'Çoktan Seçmeli', color: 'text-violet-400 border-violet-500/30 bg-violet-500/10', icon: <HelpCircle className="w-4 h-4 text-violet-400" /> };
            case 'tf': return { label: 'Doğru/Yanlış', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10', icon: <HelpCircle className="w-4 h-4 text-rose-400" /> };
            case 'fitb': return { label: 'Boşluk Doldurma', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', icon: <HelpCircle className="w-4 h-4 text-amber-400" /> };
            case 'sentenceScramble': return { label: 'Cümle Düzeltme', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10', icon: <Shuffle className="w-4 h-4 text-cyan-400" /> };
            case 'anagramGame': 
            case 'anagramFlashcard': return { label: 'Anagram', color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10', icon: <Puzzle className="w-4 h-4 text-fuchsia-400" /> };
            case 'visual': return { label: 'Görsel', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10', icon: <ImageIcon className="w-4 h-4 text-teal-400" /> };
            case 'video': return { label: 'Video', color: 'text-red-400 border-red-500/30 bg-red-500/10', icon: <Video className="w-4 h-4 text-red-400" /> };
            case 'activityLink': return { label: 'Etkinlik', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10', icon: <Gamepad2 className="w-4 h-4 text-orange-400" /> };
            case 'htmlSlide': return { label: 'HTML Slayt', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10', icon: <FileText className="w-4 h-4 text-sky-400" /> };
            default: return { label: step.type, color: 'text-slate-400 border-white/10 bg-white/5', icon: <BookOpen className="w-4 h-4 text-slate-400" /> };
        }
    };

    const renderContentPreview = () => {
        switch (step.type) {
            case 'content': 
                return <div className="line-clamp-2 text-xs text-slate-400" dangerouslySetInnerHTML={{ __html: (step as any).content || 'Metin içeriği girilmemiş.' }} />;
            case 'objectiveList': 
                const objItems = (step as any).items || [];
                return <span className="text-xs font-semibold text-yellow-400/80">{objItems.length} Öğrenme Hedefi</span>;
            case 'conceptExplanation': 
                const concItems = (step as any).items || (step as any).content?.items || [];
                return <span className="text-xs font-semibold text-indigo-300">{concItems.length} Kavram ve Tanım</span>;
            case 'flashcard': 
                const cards = (step as any).cards || [];
                return <span className="text-xs font-semibold text-emerald-300">{cards.length} Bilgi Kartı</span>;
            case 'trueFalseList':
                const tfQuestions = (step as any).questions || [];
                return (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-semibold text-purple-300">{tfQuestions.length} İfade</span>
                        {tfQuestions.slice(0, 2).map((q: any, idx: number) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-white/5 text-slate-400 truncate max-w-[140px]">
                                {q.isTrue ? "✓" : "✗"} {q.statement}
                            </span>
                        ))}
                    </div>
                );
            case 'mcq':
                return (
                    <div className="flex flex-col gap-1 text-xs">
                        <div className="text-slate-300 font-medium line-clamp-1">{(step as any).question}</div>
                        <div className="flex flex-wrap gap-1">
                            {(step as any).options?.slice(0, 4).map((opt: string, i: number) => (
                                <span key={i} className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] border",
                                    opt === (step as any).correctAnswer 
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold" 
                                        : "bg-slate-950 border-white/5 text-slate-500"
                                )}>
                                    {opt}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            case 'sentenceScramble':
                return (
                    <div className="text-xs text-slate-400">
                        <span className="text-slate-300 font-medium">{(step as any).correctSentence}</span>
                    </div>
                );
            case 'anagramGame':
            case 'anagramFlashcard':
                const anagCards = (step as any).cards || [];
                return <span className="text-xs font-semibold text-fuchsia-300">{anagCards.length} Kelime Kartı</span>;
            case 'visual': 
                return (step as any).imageUrl ? (
                    <div className="relative h-10 w-16 rounded-lg overflow-hidden border border-white/10 bg-slate-950">
                        <img src={(step as any).imageUrl} alt={step.title} className="w-full h-full object-cover" />
                    </div>
                ) : <span className="text-xs text-slate-500">Görsel URL eklenmemiş</span>;
            case 'video': 
                return <span className="text-xs text-rose-400/80 truncate block max-w-[240px]">{(step as any).url || 'Video bağlantısı eklenmemiş'}</span>;
            case 'activityLink':
                return <span className="text-xs text-orange-300 font-medium">Oyun: {(step as any).activityLabel || (step as any).title}</span>;
            default:
                return null;
        }
    };

    const isPublished = step.isPublished ?? true;
    const meta = getTypeMeta();

    return (
        <div ref={setNodeRef} style={style} className="group">
            <Card className={cn(
                "backdrop-blur-xl border transition-all duration-200 rounded-2xl overflow-hidden shadow-lg",
                isPublished 
                    ? "bg-slate-900/80 hover:bg-slate-900 border-white/10 hover:border-indigo-500/40 hover:shadow-indigo-950/30" 
                    : "bg-slate-950/40 border-slate-800/40 opacity-50 hover:opacity-100"
            )}>
                <div className="flex items-center p-3 sm:p-4 gap-3">
                    {/* Sıralama Taşıma Çubuğu */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <button 
                            className="touch-none p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white cursor-grab active:cursor-grabbing transition-colors"
                            {...listeners} {...attributes}
                            title="Sürükleyip Bırak"
                        >
                            <Grip className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Sıra Numarası ve İkon */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-950 text-slate-400 text-xs font-black font-mono border border-white/10 shadow-inner">
                            {order}
                        </span>
                        <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
                            {meta.icon}
                        </div>
                    </div>

                    {/* İçerik ve Başlık */}
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn("text-sm font-black truncate transition-colors", isPublished ? "text-white" : "text-slate-400")}>
                                {step.title || 'Başlıksız Adım'}
                            </h4>
                            <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0 border", meta.color)}>
                                {meta.label}
                            </Badge>
                        </div>
                        <div>
                            {renderContentPreview()}
                        </div>
                    </div>

                    {/* Hızlı Yukarı/Aşağı Butonları */}
                    <div className="hidden sm:flex flex-col gap-0.5 flex-shrink-0">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={isFirst}
                            onClick={onMoveUp}
                            className="h-6 w-6 text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-20"
                            title="Yukarı Taşı"
                        >
                            <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={isLast}
                            onClick={onMoveDown}
                            className="h-6 w-6 text-slate-500 hover:text-white hover:bg-white/10 disabled:opacity-20"
                            title="Aşağı Taşı"
                        >
                            <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Eylem Butonları */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg" 
                            onClick={onTogglePublish} 
                            title={isPublished ? "Sunumda Gizle" : "Sunumda Göster"}
                        >
                            {isPublished ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-amber-500" />}
                        </Button>
                        
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-lg" 
                            onClick={onDuplicate}
                            title="Bu Adımı Klonla (Çoğalt)"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>

                        {step.type === 'accordion' && onSplit && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:bg-blue-500/20 hover:text-blue-400 rounded-lg" 
                                onClick={onSplit} 
                                title="Akordiyonu Ayrı Adımlara Böl"
                            >
                                <LayersIcon className="h-4 w-4" />
                            </Button>
                        )}

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg" 
                            onClick={onEdit}
                            title="Düzenle"
                        >
                            <FilePenLine className="h-4 w-4" />
                        </Button>

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg" 
                            onClick={onDelete}
                            title="Sil"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}

// ══ ARAYA ADIM EKLEME ÇİZGİSİ ══
function InsertStepDivider({ 
    onAddStep, 
    onOpenLibrary, 
    onOpenAi,
    insertIndex 
}: { 
    onAddStep: (type: LessonStep['type'], title: string, atIndex?: number) => void;
    onOpenLibrary: (filter: any, multiSelect: boolean, stepType: any, atIndex?: number) => void;
    onOpenAi?: () => void;
    insertIndex: number;
}) {
    const anlatimOptions: { label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void }[] = [
        { label: 'Metin İçeriği', type: 'content', defaultTitle: 'Metin İçeriği' },
        { label: 'Öğrenme Hedefleri', type: 'objectiveList', defaultTitle: 'Öğrenme Hedefleri' },
        { label: 'Kavram Açıklamaları', type: 'conceptExplanation', defaultTitle: 'Kavram Açıklamaları' },
        { label: 'Bilgi Kartları', type: 'flashcard', defaultTitle: 'Bilgi Kartları' },
        { label: 'Görsel / Şema', type: 'visual', defaultTitle: 'Görsel' },
        { label: 'Video', type: 'video', defaultTitle: 'Video' },
        { label: 'İnteraktif HTML Slayt', type: 'htmlSlide', defaultTitle: 'İnteraktif Sunum' },
        { label: 'Akordiyon Özet', type: 'accordion', defaultTitle: 'Konu Özeti' },
        { label: 'Veri Bankası: Kavramlar', action: () => onOpenLibrary(['concept'], true, 'keyConcepts', insertIndex) },
        { label: 'Veri Bankası: Bilgi Kartları', action: () => onOpenLibrary(['definition'], true, 'flashcard', insertIndex) },
        { label: 'Arşivden Görsel Ekle', action: () => onOpenLibrary(['images'], true, 'visual', insertIndex) },
    ];

    const degerlendirmeOptions: { label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void }[] = [
        { label: 'Çoktan Seçmeli Soru', type: 'mcq', defaultTitle: 'Kontrol Sorusu' },
        { label: 'Doğru / Yanlış', type: 'tf', defaultTitle: 'Doğru/Yanlış' },
        { label: 'Doğru / Yanlış Listesi', type: 'trueFalseList', defaultTitle: 'Doğru/Yanlış Alıştırması' },
        { label: 'Boşluk Doldurma', type: 'fitb', defaultTitle: 'Boşluk Doldurma' },
        { label: 'Kelime Dehası / Anagram', type: 'anagramGame', defaultTitle: 'Kelime Dehası' },
        { label: 'Cümle Düzeltme (Karışık Cümle)', type: 'sentenceScramble', defaultTitle: 'Cümle Düzeltme' },
        { label: 'Soru Bankasından Soru Ekle', action: () => onOpenLibrary(['questions'], true, 'questions', insertIndex) },
    ];

    return (
        <div className="relative py-2 group flex items-center justify-center">
            {/* Çizgi */}
            <div className="absolute inset-x-0 h-px bg-white/5 group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-indigo-500/50 group-hover:to-transparent transition-all duration-300" />
            
            {/* Buton */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button 
                        type="button"
                        className="relative z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 group-hover:scale-100 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-indigo-500/40 text-indigo-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-400 text-xs font-bold shadow-lg shadow-indigo-950/80 cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5" /> Buraya Adım Ekle
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-64 rounded-2xl shadow-2xl p-2 z-50">
                    <DropdownMenuLabel className="text-[11px] font-black uppercase text-indigo-400 tracking-wider px-2 py-1">
                        Anlatım Adımı Ekle
                    </DropdownMenuLabel>
                    {anlatimOptions.map(opt => (
                        <DropdownMenuItem 
                            key={opt.label} 
                            onClick={() => opt.action ? opt.action() : onAddStep(opt.type!, opt.defaultTitle!, insertIndex)}
                            className="text-xs font-semibold focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                        >
                            {opt.label}
                        </DropdownMenuItem>
                    ))}
                    
                    <DropdownMenuSeparator className="bg-white/10 my-1" />
                    
                    <DropdownMenuLabel className="text-[11px] font-black uppercase text-purple-400 tracking-wider px-2 py-1">
                        Değerlendirme Adımı Ekle
                    </DropdownMenuLabel>
                    {degerlendirmeOptions.map(opt => (
                        <DropdownMenuItem 
                            key={opt.label} 
                            onClick={() => opt.action ? opt.action() : onAddStep(opt.type!, opt.defaultTitle!, insertIndex)}
                            className="text-xs font-semibold focus:bg-purple-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                        >
                            {opt.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

// ══ ANA KONU DÜZENLEYİCİ BİLEŞENİ ══
export function TopicEditor({ 
    title, setTitle, steps, setSteps, sourceText, setSourceText, htmlContent, setHtmlContent,
    onSave, isSaving, isUnitFlow = false, onOpenAIGeneration, children
}: { 
    title: string, setTitle: (t: string) => void,
    steps: DraggableLessonStep[], setSteps: (s: DraggableLessonStep[] | ((prev: DraggableLessonStep[]) => DraggableLessonStep[])) => void,
    sourceText: string, setSourceText: (t: string) => void,
    htmlContent?: string, setHtmlContent?: (c: string) => void,
    onSave: () => Promise<void>,
    isSaving: boolean,
    isUnitFlow?: boolean,
    onOpenAIGeneration?: (type: 'anlatim' | 'degerlendirme', context: { title: string, sourceText: string }) => void;
    children?: React.ReactNode;
}) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<{ step: LessonStep; index: number } | null>(null);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
    const [libraryConfig, setLibraryConfig] = useState<{ filter: any[]; multiSelect: boolean; stepType: any; targetIndex?: number }>({ filter: [], multiSelect: false, stepType: 'content' });
    
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    
    const context = useMemo(() => ({
        courseId,
        unitId,
        topicId
    }), [courseId, unitId, topicId]);
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    const addIdToSteps = (stepsList: LessonStep[]): DraggableLessonStep[] => {
        return stepsList.map((step, index) => ({ 
            ...step, 
            id: (step as any).id || `step-${Date.now()}-${index}-${Math.random()}` 
        }));
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSteps((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleMoveStep = (fromIndex: number, direction: 'up' | 'down') => {
        const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= steps.length) return;
        setSteps(items => arrayMove(items, fromIndex, toIndex));
    };

    const handleAddStep = (type: LessonStep['type'], defaultTitle: string, atIndex?: number) => {
        let newStep: LessonStep;

        switch(type) {
            case 'content': newStep = { type, title: defaultTitle, content: '<h1>Başlık</h1><p>İçeriği buraya girin...</p>' }; break;
            case 'objectiveList': newStep = { type, title: defaultTitle, items: ['Yeni hedef...'] }; break;
            case 'conceptExplanation': newStep = { type, title: defaultTitle, items: [{ concept: "Kavram 1", definition: "Tanım 1"}] }; break;
            case 'flashcard': newStep = { type, title: defaultTitle, cards: [{ term: 'Terim', definition: 'Tanım' }] }; break;
            case 'visual': newStep = { type, title: defaultTitle, imageUrl: 'https://placehold.co/800x600.png' }; break;
            case 'mcq': newStep = { type, title: defaultTitle, question: 'Soru metni?', options: ['Seçenek A', 'Seçenek B', 'Seçenek C', 'Seçenek D'], correctAnswer: 'Seçenek A' }; break;
            case 'tf': newStep = { type, title: defaultTitle, statement: 'Bu ifade doğru mu?', isTrue: true }; break;
            case 'trueFalseList': newStep = { type, title: defaultTitle, questions: [{ statement: 'Yeni ifade...', isTrue: true}] }; break;
            case 'fitb': newStep = { type, title: defaultTitle, sentenceWithBlank: 'Boşluğu _____ doldurun.', options: ['Cevap A', 'Cevap B', 'Cevap C', 'Cevap D'], correctAnswer: 'Cevap A' }; break;
            case 'anagramGame': newStep = { type, title: 'Kelime Dehası', cards: [{ definition: 'İpucu', scrambledWord: 'YENI', correctAnswer: 'YENİ' }] }; break;
            case 'anagramFlashcard': newStep = { type, title: defaultTitle, cards: [{ definition: 'İpucu', scrambledWord: 'AKARNA', correctAnswer: 'ANKARA' }] }; break;
            case 'sentenceScramble': newStep = { type, title: defaultTitle, scrambledSentence: 'bir bu cümledir karışık', correctSentence: 'bu bir karışık cümledir' }; break;
            case 'iframe': newStep = { type, title: defaultTitle, url: 'https://phet.colorado.edu/tr/simulations/list' }; break;
            case 'htmlSlide': newStep = { type: 'htmlSlide', title: 'İnteraktif Sunum', htmlContent: '<!DOCTYPE html>\n<html lang="tr">\n<head>\n  <title>Başlık</title>\n</head>\n<body>\n  <h1>Merhaba Dünya</h1>\n</body>\n</html>' }; break;
            case 'video': newStep = { type, title: defaultTitle, url: 'https://www.youtube.com/embed/...' }; break;
            case 'activityLink': 
                newStep = {
                    type: 'activityLink',
                    title: 'Yeni Etkinlik',
                    activityType: '',
                    activityLabel: '',
                    courseId: context?.courseId || undefined,
                    unitId: context?.unitId || undefined,
                    topicId: context?.topicId || undefined,
                };
                break;
            case 'accordion': newStep = { type: 'accordion', title: 'Akordiyon Özet', items: [{ id: `item-${Date.now()}`, title: 'Başlık 1', content: 'İçerik 1'}] }; break;
            default: return;
        }

        const newStepWithId: DraggableLessonStep = { ...newStep, id: `step-${Date.now()}-${Math.random()}` };
        
        setSteps(currentSteps => {
            if (atIndex !== undefined && atIndex >= 0 && atIndex <= currentSteps.length) {
                const updated = [...currentSteps];
                updated.splice(atIndex, 0, newStepWithId);
                return updated;
            }
            return [...currentSteps, newStepWithId];
        });
    };

    const handleDuplicateStep = (index: number) => {
        const stepToCopy = steps[index];
        const clonedStep: DraggableLessonStep = {
            ...JSON.parse(JSON.stringify(stepToCopy)),
            id: `step-${Date.now()}-${Math.random()}`,
            title: `${stepToCopy.title} (Kopya)`
        };
        setSteps(currentSteps => {
            const updated = [...currentSteps];
            updated.splice(index + 1, 0, clonedStep);
            return updated;
        });
        toast({ title: "Adım Çoğaltıldı", description: `"${clonedStep.title}" akışa eklendi.` });
    };

    const handleDeleteStep = (stepIndex: number) => {
        setSteps(currentSteps => currentSteps.filter((_, index) => index !== stepIndex));
    };

    const handleTogglePublishStep = (index: number) => {
        setSteps(currentSteps => {
            const newSteps = [...currentSteps];
            const currentStep = newSteps[index];
            newSteps[index] = { ...currentStep, isPublished: !(currentStep.isPublished ?? true) };
            return newSteps;
        });
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
        setEditingStep(null);
        toast({ title: "Adım Güncellendi", description: "Değişiklikleri kalıcı yapmak için ana 'Kaydet' butonuna basınız." });
    };
    
    const handleAddSteps = (newSteps: LessonStep[], atIndex?: number) => {
        const newStepsWithIds = addIdToSteps(newSteps);
        setSteps(currentSteps => {
            if (atIndex !== undefined && atIndex >= 0 && atIndex <= currentSteps.length) {
                const updated = [...currentSteps];
                updated.splice(atIndex, 0, ...newStepsWithIds);
                return updated;
            }
            return [...currentSteps, ...newStepsWithIds];
        });
        toast({
            title: "İçerik Eklendi!",
            description: `${newSteps.length} yeni adım akışa eklendi.`,
        });
    };
    
    const handleOpenLibrary = (filter: any[], multiSelect: boolean, stepType: any, atIndex?: number) => {
        setLibraryConfig({ filter, multiSelect, stepType, targetIndex: atIndex });
        setIsLibraryPanelOpen(true);
    };

    const handleItemsImportedFromLibrary = (importedItems: any[], stepType: any) => {
        if (importedItems.length === 0) return;
        
        let newSteps: LessonStep[] = [];
        
        if (stepType === 'visual' && libraryConfig.filter.includes('images')) {
            newSteps = importedItems.map(item => ({
                type: 'visual',
                title: item.title || 'Arşivden Görsel',
                imageUrl: item.url
            }));
        } else if (stepType === 'flashcard') {
            const cards = importedItems.map(item => ({ 
                term: item.content?.term || item.title || '', 
                definition: item.content?.definition || item.definition || ''
            }));
            newSteps.push({ type: 'flashcard', title: 'Bilgi Kartları', cards });
        } else if (stepType === 'anagramGame') {
            const cards = importedItems.map(item => {
                const cleanWord = cleanForAnagram(item.content?.term || item.content?.text || '');
                return {
                    definition: item.content?.definition || 'Tanım bulunamadı.',
                    correctAnswer: cleanWord,
                    scrambledWord: cleanWord.replace(/\s/g, '').split('').sort(() => Math.random() - 0.5).join('').toLocaleUpperCase('tr-TR'),
                };
            });
            newSteps.push({ type: 'anagramGame', title: 'Kelime Dehası', cards });
        } else if (stepType === 'anagramFlashcard') {
            const cards = importedItems.map(item => ({
                definition: `İpucu: Bu kelime "${item.content?.text || item.content?.term || ''}"`,
                scrambledWord: (item.content?.text || item.content?.term || '').split('').sort(() => Math.random() - 0.5).join('').toLocaleUpperCase('tr-TR'),
                correctAnswer: item.content?.text || item.content?.term || ''
            }));
            newSteps.push({ type: 'anagramFlashcard', title: 'Anagram Kartları', cards });
        } else if (stepType === 'sentenceScramble') {
            const newSentence = importedItems[0]?.content?.text || '';
            newSteps.push({
                type: 'sentenceScramble',
                title: 'Cümle Düzeltme',
                correctSentence: newSentence,
                scrambledSentence: newSentence.split(' ').sort(() => Math.random() - 0.5).join(' ')
            });
        } else if (stepType === 'keyConcepts') {
            const items = importedItems.map(item => ({
                concept: item.content?.term || item.content?.text || 'Kavram',
                definition: item.content?.definition || ''
            }));
            newSteps.push({ type: 'conceptExplanation', title: 'Kavram Açıklamaları', items });
        } else if (stepType === 'questions') {
            importedItems.forEach(item => {
                if (item.type === 'Çoktan Seçmeli') newSteps.push({ type: 'mcq', title: item.text, ...item });
                else if (item.type === 'Doğru/Yanlış') newSteps.push({ type: 'tf', title: item.text, statement: item.text, isTrue: item.correctAnswer === 'Doğru' });
                else if (item.type === 'Boşluk Doldurma') newSteps.push({ type: 'fitb', title: 'Boşluk Doldurma', sentenceWithBlank: item.text, options: item.options || [], correctAnswer: item.correctAnswer || '' });
            });
        }

        if (newSteps.length > 0) {
            handleAddSteps(newSteps, libraryConfig.targetIndex);
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
            toast({ title: "Akordiyon Bölündü", description: `${newContentSteps.length} ayrı adım oluşturuldu.` });
        }
    };

    const anlatimStepOptions: { label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void }[] = [
        { label: 'Metin İçeriği', type: 'content', defaultTitle: 'Metin İçeriği' },
        { label: 'Öğrenme Hedefleri', type: 'objectiveList', defaultTitle: 'Bu Konuda Öğreneceklerimiz' },
        { label: 'Kavram Açıklamaları', type: 'conceptExplanation', defaultTitle: 'Kavram Açıklamaları' },
        { label: 'Bilgi Kartları', type: 'flashcard', defaultTitle: 'Bilgi Kartları' },
        { label: 'Kavramlar (Veri Bankası)', action: () => handleOpenLibrary(['concept'], true, 'keyConcepts') },
        { label: 'Kartlar (Veri Bankası)', action: () => handleOpenLibrary(['definition'], true, 'flashcard') },
        { label: 'Görsel / Şema', type: 'visual', defaultTitle: 'Görsel' },
        { label: 'Görsel (Arşivden)', action: () => handleOpenLibrary(['images'], true, 'visual') },
        { label: 'Video', type: 'video', defaultTitle: 'Video' },
        { label: 'İnteraktif HTML Slayt', type: 'htmlSlide', defaultTitle: 'İnteraktif Sunum' },
        { label: 'Akordiyon Özet', type: 'accordion', defaultTitle: 'Konu Özeti' },
        { label: 'Dış Simülasyon / Sayfa', type: 'iframe', defaultTitle: 'İnteraktif Etkinlik' },
    ];

    const degerlendirmeStepOptions: { label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void }[] = [
        { label: 'Çoktan Seçmeli Soru', type: 'mcq', defaultTitle: 'Kontrol Sorusu' },
        { label: 'Doğru / Yanlış', type: 'tf', defaultTitle: 'Doğru/Yanlış' },
        { label: 'Doğru / Yanlış Listesi', type: 'trueFalseList', defaultTitle: 'Doğru/Yanlış Alıştırması' },
        { label: 'Boşluk Doldurma', type: 'fitb', defaultTitle: 'Boşluk Doldurma' },
        { label: 'Kelime Dehası', type: 'anagramGame', defaultTitle: 'Kelime Dehası' },
        { label: 'Cümle Düzeltme', type: 'sentenceScramble', defaultTitle: 'Cümle Düzeltme' },
        { label: 'Soru Bankasından Soru Ekle', action: () => handleOpenLibrary(['questions'], true, 'questions') },
        { label: 'Cümle Düzeltme (Veri Bankası)', action: () => handleOpenLibrary(['sentence'], true, 'sentenceScramble') },
    ];

    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px]" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10 space-y-6">
                
                {/* ══ STÜDYO ÜST ÇUBUK ══ */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-3xl shadow-xl">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Button asChild variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl h-11 w-11 flex-shrink-0">
                            <Link href="/teacher/content-creation">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div className="flex-1 min-w-0">
                            <Input 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)} 
                                className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase drop-shadow-md bg-transparent border-0 h-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0 truncate" 
                            />
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                Toplam <strong className="text-indigo-300">{steps.length}</strong> adım / slayt
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap items-center w-full sm:w-auto justify-end">
                        <Button 
                            variant="secondary" 
                            onClick={() => setIsPreviewOpen(true)} 
                            className="bg-slate-800 text-white hover:bg-slate-700 border border-white/10 shadow-md rounded-xl text-xs font-bold"
                        >
                            <Eye className="mr-1.5 h-4 w-4 text-cyan-400" /> Önizle
                        </Button>

                        <Button 
                            variant="outline" 
                            onClick={() => handleOpenLibrary(['concept', 'definition', 'sentence', 'questions', 'images'], true, 'content')} 
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent rounded-xl text-xs font-bold"
                        >
                            <Library className="mr-1.5 h-4 w-4 text-emerald-400" /> Kütüphane
                        </Button>

                        <Button 
                            variant="outline" 
                            onClick={() => setIsBulkImportOpen(true)} 
                            className="border-white/10 text-slate-300 hover:text-white hover:bg-white/5 bg-transparent rounded-xl text-xs font-bold"
                        >
                            <Upload className="mr-1.5 h-4 w-4 text-amber-400" /> Toplu Ekle
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-950/40 rounded-xl text-xs font-black">
                                    <Sparkles className="mr-1.5 h-4 w-4 text-yellow-300 animate-pulse" /> AI ile Üret
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-56 rounded-2xl shadow-2xl p-2 z-50">
                                <DropdownMenuItem onClick={() => onOpenAIGeneration?.('anlatim', { title, sourceText })} className="focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer text-xs font-semibold py-2">
                                    <FileText className="mr-2 h-4 w-4 text-blue-400" /> Anlatım Adımları Üret
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onOpenAIGeneration?.('degerlendirme', { title, sourceText })} className="focus:bg-purple-600 focus:text-white rounded-lg cursor-pointer text-xs font-semibold py-2">
                                    <HelpCircle className="mr-2 h-4 w-4 text-purple-400" /> Değerlendirme Soruları Üret
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button 
                            onClick={onSave} 
                            disabled={isSaving} 
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-40 text-xs px-5"
                        >
                            {isSaving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                            Kaydet
                        </Button>
                    </div>
                </div>

                {/* ══ KAYNAK METİN AKORDİYONU ══ */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden rounded-3xl">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="source-text" className="border-b-0">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-base font-black text-white">Kaynak Metin (Yapay Zeka & Özet Temeli)</span>
                                        <span className="text-xs text-slate-400 font-normal">Bu metin, yapay zekanın konuya özel içerik üretmesi için temel alınır.</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-2 bg-slate-950/40">
                                <Textarea 
                                    value={sourceText} 
                                    onChange={(e) => setSourceText(e.target.value)}
                                    placeholder="Ders kitabı metnini, kazanım açıklamalarını veya konu özetini buraya yapıştırın..."
                                    className="min-h-[130px] text-sm bg-slate-950 border-white/10 text-white focus:border-indigo-500 rounded-2xl leading-relaxed"
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>

                {children}
                
                {/* ══ DERS AKIŞI LİSTESİ & ADIM YÖNETİMİ ══ */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30 text-purple-400">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">Sunum & Ders Akışı Adımları</h2>
                                <p className="text-xs text-slate-400">Sıralamayı sürükleyerek veya oklarla değiştirebilir, aralara yeni adım ekleyebilirsiniz.</p>
                            </div>
                        </div>

                        {/* Hızlı Ekleme Butonları */}
                        <div className="flex gap-2 flex-wrap">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-blue-500/30 text-blue-300 hover:text-white hover:bg-blue-600/20 bg-blue-950/30 rounded-xl font-bold text-xs">
                                        <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Anlatım Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-56 rounded-2xl shadow-2xl p-1.5 z-50">
                                    {anlatimStepOptions.map(opt => (
                                        <DropdownMenuItem 
                                            key={opt.label} 
                                            onClick={() => opt.action ? opt.action() : handleAddStep(opt.type!, opt.defaultTitle!)} 
                                            className="text-xs font-semibold focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer py-1.5"
                                        >
                                            {opt.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-600/20 bg-purple-950/30 rounded-xl font-bold text-xs">
                                        <Brain className="mr-1.5 h-3.5 w-3.5" /> Değerlendirme Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-56 rounded-2xl shadow-2xl p-1.5 z-50">
                                    {degerlendirmeStepOptions.map(opt => (
                                        <DropdownMenuItem 
                                            key={opt.label} 
                                            onClick={() => opt.action ? opt.action() : handleAddStep(opt.type!, opt.defaultTitle!)} 
                                            className="text-xs font-semibold focus:bg-purple-600 focus:text-white rounded-lg cursor-pointer py-1.5"
                                        >
                                            {opt.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="border-orange-500/30 text-orange-300 hover:text-white hover:bg-orange-600/20 bg-orange-950/30 rounded-xl font-bold text-xs">
                                        <Gamepad2 className="mr-1.5 h-3.5 w-3.5" /> Etkinlik Ekle
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-56 max-h-72 overflow-y-auto rounded-2xl shadow-2xl p-1.5 z-50">
                                    {playableActivities.map(act => (
                                        <DropdownMenuItem 
                                            key={act.href} 
                                            onClick={() => {
                                                const newStep = {
                                                    type: 'activityLink',
                                                    title: `${act.label} Etkinliği`,
                                                    activityType: act.href,
                                                    activityLabel: act.label,
                                                    courseId: context?.courseId || undefined,
                                                    unitId: context?.unitId || undefined,
                                                    topicId: context?.topicId || undefined,
                                                } as any;
                                                const newStepWithId: DraggableLessonStep = { ...newStep, id: `step-${Date.now()}-${Math.random()}` };
                                                setSteps(currentSteps => [...currentSteps, newStepWithId]);
                                            }} 
                                            className="text-xs font-semibold focus:bg-orange-600 focus:text-white rounded-lg cursor-pointer py-1.5"
                                        >
                                            {act.label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    
                    {/* Sürükle-Bırak Listesi */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-1 pb-24">
                                {steps.length > 0 ? (
                                    <>
                                        {/* Başa Ekleme Çizgisi */}
                                        <InsertStepDivider 
                                            insertIndex={0}
                                            onAddStep={handleAddStep}
                                            onOpenLibrary={handleOpenLibrary}
                                            onOpenAi={() => onOpenAIGeneration?.('anlatim', { title, sourceText })}
                                        />

                                        {steps.map((step, index) => (
                                            <div key={step.id}>
                                                <StepCard 
                                                    id={step.id}
                                                    order={index + 1}
                                                    step={step} 
                                                    isFirst={index === 0}
                                                    isLast={index === steps.length - 1}
                                                    onEdit={() => handleOpenEditor(index)} 
                                                    onDelete={() => handleDeleteStep(index)}
                                                    onDuplicate={() => handleDuplicateStep(index)}
                                                    onMoveUp={() => handleMoveStep(index, 'up')}
                                                    onMoveDown={() => handleMoveStep(index, 'down')}
                                                    onSplit={step.type === 'accordion' ? () => handleSplitStep(index) : undefined}
                                                    onTogglePublish={() => handleTogglePublishStep(index)}
                                                />

                                                {/* Her adımın ardına araya ekleme çizgisi */}
                                                <InsertStepDivider 
                                                    insertIndex={index + 1}
                                                    onAddStep={handleAddStep}
                                                    onOpenLibrary={handleOpenLibrary}
                                                    onOpenAi={() => onOpenAIGeneration?.('anlatim', { title, sourceText })}
                                                />
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/40 text-slate-500">
                                        <PlusCircle className="h-16 w-16 mb-4 opacity-20" />
                                        <p className="text-xl font-bold">Henüz adım eklenmemiş.</p>
                                        <p className="text-sm text-slate-600 mt-1">Yukarıdaki butonları veya AI asistanını kullanarak içerik ekleyin.</p>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

                {/* Modallar */}
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
                    isSaving={isSaving}
                    context={context}
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

function TopicEditorWrapper() {
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    const { toast } = useToast();
    
    const [title, setTitle] = useState('');
    const [steps, setSteps] = useState<DraggableLessonStep[]>([]);
    const [sourceText, setSourceText] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [aiGenType, setAiGenType] = useState<'anlatim' | 'degerlendirme' | null>(null);
    const [aiGenContext, setAiGenContext] = useState<{ topicId: string, topicTitle: string, sourceText?: string } | null>(null);
    const [isAIOpen, setIsAIOpen] = useState(false);
    
    const addIdToSteps = (stepsList: LessonStep[]): DraggableLessonStep[] => {
        return stepsList.map((step, index) => ({ 
            ...step, 
            id: (step as any).id || `step-${Date.now()}-${index}-${Math.random()}` 
        }));
    };

    const fetchTopicData = useCallback(async () => {
        if (!courseId || !unitId || !topicId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
            const topicSnap = await getDoc(topicRef);
            if (topicSnap.exists()) {
                const topicData = { id: topicSnap.id, ...topicSnap.data() } as Topic;
                setTitle(topicData.title || '');
                setSteps(addIdToSteps(topicData.steps || []));
                setSourceText(topicData.sourceText || '');
                setHtmlContent(topicData.htmlContent || '');
            } else {
                toast({ title: "Hata", description: "Konu bulunamadı.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Hata", description: "Konu yüklenirken sorun oluştu: " + err.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [courseId, unitId, topicId, toast]);

    useEffect(() => {
        fetchTopicData();
    }, [fetchTopicData]);

    const handleSaveFlow = async () => {
        if (!courseId || !unitId || !topicId) return;
        setIsSaving(true);
        const stepsToSave = steps.map(({ id, ...rest }) => rest);
        const result = await updateTopicContent({ courseId, unitId, topicId, steps: stepsToSave, sourceText, htmlContent });
        if (result.success) { 
            toast({ title: "Başarılı", description: "Ders akışı başarıyla kaydedildi." });
        } else { 
            toast({ title: "Hata", description: result.error, variant: "destructive" }); 
        }
        setIsSaving(false);
    };
    
    const handleStepsGenerated = (newSteps: LessonStep[]) => {
        const newStepsWithIds = newSteps.map((step, index) => ({
            ...step,
            id: `step-${Date.now()}-${index}-${Math.random()}`
        }));
        setSteps(prev => [...prev, ...newStepsWithIds]);
        toast({
            title: "Yapay Zeka İçeriği Eklendi!",
            description: `${newSteps.length} yeni adım taslağa eklendi. Kalıcı yapmak için 'Kaydet' butonuna basın.`
        });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-purple-500" />
            </div>
        );
    }
    
    if (!courseId || !unitId || !topicId) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400 font-bold">
                Geçersiz URL. Lütfen içerik yönetimi sayfasından bir konu seçin.
            </div>
        );
    }
    
    return (
        <>
            <TopicEditor
                title={title} setTitle={setTitle}
                steps={steps} setSteps={setSteps}
                sourceText={sourceText} setSourceText={setSourceText}
                htmlContent={htmlContent} setHtmlContent={setHtmlContent}
                onSave={handleSaveFlow}
                isSaving={isSaving}
                onOpenAIGeneration={(type, genCtx) => {
                    if (topicId) {
                        setAiGenType(type);
                        setAiGenContext({ topicId, topicTitle: genCtx.title, sourceText: genCtx.sourceText });
                        setIsAIOpen(true);
                    }
                }}
            >
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden rounded-3xl">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="html-content" className="border-b-0">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-base font-black text-white">İnteraktif HTML İçeriği</span>
                                        <span className="text-xs text-slate-400 font-normal">Bu konunun detay sayfasında gösterilecek tam sayfa HTML içeriği.</span>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-2 bg-slate-950/40">
                                <Textarea
                                    value={htmlContent || ''}
                                    onChange={(e) => setHtmlContent(e.target.value)}
                                    placeholder="Konu detay sayfasında gösterilecek tam HTML kodunu buraya yapıştırın..."
                                    className="min-h-[260px] font-mono text-xs bg-slate-950 border-white/10 text-slate-300 focus:border-indigo-500 rounded-2xl leading-relaxed"
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>
            </TopicEditor>

            <AiLessonStepGenerationDialog
                isOpen={isAIOpen}
                onOpenChange={setIsAIOpen}
                context={aiGenContext}
                onStepsGenerated={handleStepsGenerated}
                generationType={aiGenType}
            />
        </>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-purple-500" /></div>}>
            <TopicEditorWrapper />
        </Suspense>
    );
}