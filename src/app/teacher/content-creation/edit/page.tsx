'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { LessonStep, Topic, AccordionStep, ActivityLinkStep, ActivityItem, Question, ImageAsset, NotebookNoteStep, CategoryTableStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    Loader2, PlusCircle, Brain, BookOpen, Trash2, Save, ArrowLeft, Sparkles, 
    FilePenLine, Eye, Upload, Library, Gamepad2, Shuffle, 
    Puzzle, Layers, Grip, LayersIcon, 
    Video, FileText, Image as ImageIcon, GraduationCap, HelpCircle, Database, EyeOff, 
    CheckCircle2, XCircle, Copy, ChevronUp, ChevronDown, Plus, Check, Wand2, Flag,
    Send, Lightbulb, MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateTopicContent } from './actions';
import { setCachedSteps } from '@/lib/lesson-cache';
import { generateCustomPromptStep } from '@/ai/flows/generate-custom-prompt-step';
import Link from 'next/link';
import Image from "next/image";
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { StepEditorDialog } from '@/components/step-editor-dialog';
import { LessonPreviewDialog } from '@/components/lesson-preview-dialog';
import { BulkStepImportDialog } from '@/components/bulk-step-import-dialog';
import { LibraryImportDialog } from '@/components/library-import-dialog';
import { GameSelectorDialog } from '@/components/game-selector-dialog';
import { RegisteredAssetsDrawer } from '@/components/registered-assets-drawer';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { AiLessonStepGenerationDialog } from '@/components/ai-lesson-step-generation-dialog';
import { SlideFilmstrip } from '@/components/studio/slide-filmstrip';
import { SlideCanvas } from '@/components/studio/slide-canvas';
import { SlideInspector } from '@/components/studio/slide-inspector';
import { ResizableStudioLayout } from '@/components/studio/resizable-studio-layout';
import { cn, cleanForAnagram, scrambleAnagramWord } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Monitor, ListFilter } from 'lucide-react';

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
    onTogglePublish: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 50 : 1,
    };

    const getTypeMeta = () => {
        switch (step.type) {
            case 'hookQuestion': return { label: 'Giriş Sorusu', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', icon: <HelpCircle className="w-4 h-4 text-amber-400" /> };
            case 'notebookNote': return { label: 'Defter Notu', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', icon: <FileText className="w-4 h-4 text-emerald-400" /> };
            case 'processFlow': return { label: 'Süreç / Yol', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', icon: <Layers className="w-4 h-4 text-blue-400" /> };
            case 'conceptMatrix': return { label: '4 Boyut Matris', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', icon: <Brain className="w-4 h-4 text-purple-400" /> };
            case 'categoryTable': return { label: 'Kategori Tablosu', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', icon: <Layers className="w-4 h-4 text-emerald-400" /> };
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
            case 'activityLink': return { label: 'Oyun', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10', icon: <Gamepad2 className="w-4 h-4 text-orange-400" /> };
            case 'htmlSlide': return { label: 'HTML Slayt', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10', icon: <FileText className="w-4 h-4 text-sky-400" /> };
            case 'matching':
            case 'conceptMatching': return { label: 'Eşleştirme', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10', icon: <Shuffle className="w-4 h-4 text-indigo-400" /> };
            case 'accordion': return { label: 'Özet', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', icon: <Layers className="w-4 h-4 text-emerald-400" /> };
            default: return { label: step.type, color: 'text-slate-400 border-white/10 bg-white/5', icon: <BookOpen className="w-4 h-4 text-slate-400" /> };
        }
    };

    const renderContentPreview = () => {
        switch (step.type) {
            case 'hookQuestion':
                return <span className="text-xs font-semibold text-amber-300">🤔 {(step as any).question || 'Merak & Giriş Sorusu'}</span>;
            case 'notebookNote':
                const notesList = (step as any).notes || [];
                return <span className="text-xs font-semibold text-emerald-300">✏️ {notesList.length} Defter Maddesi (⏱️ {(step as any).suggestedMinutes || 3} dk)</span>;
            case 'processFlow':
                const flowSteps = (step as any).steps || [];
                return <span className="text-xs font-semibold text-blue-300">🪜 {flowSteps.length} Aşamalı Süreç</span>;
            case 'conceptMatrix':
                const matrixQuads = (step as any).quadrants || [];
                return <span className="text-xs font-semibold text-purple-300">🔲 {matrixQuads.length} Boyutlu Analiz</span>;
            case 'categoryTable':
                const categoriesList = (step as any).categories || [];
                return (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                        <span className="font-bold text-emerald-400">📊 {categoriesList.length} Kategori:</span>
                        {categoriesList.slice(0, 3).map((cat: any, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 border border-white/10 text-white font-semibold">
                                {cat.name} ({cat.items?.length || 0})
                            </span>
                        ))}
                    </div>
                );
            case 'content': 
                return <div className="line-clamp-2 text-xs text-slate-400" dangerouslySetInnerHTML={{ __html: (step as any).content || 'Metin içeriği girilmemiş.' }} />;
            case 'objectiveList': 
                const objItems = (step as any).items || [];
                return <span className="text-xs font-semibold text-yellow-400/80">{objItems.length} Öğrenme Hedefi</span>;
            case 'conceptExplanation': 
                const concItems = (step as any).items || (step as any).content?.items || [];
                return <span className="text-xs font-semibold text-indigo-300">{concItems.length} Kavram ve Tanım</span>;
            case 'matching':
            case 'conceptMatching':
                const matchPairs = (step as any).pairs || [];
                return <span className="text-xs font-semibold text-indigo-300">{matchPairs.length} Kavram - Tanım Eşleşmesi</span>;
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
            case 'tf':
                return (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="truncate max-w-[280px]">{(step as any).statement}</span>
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", (step as any).isTrue ? "border-emerald-500/40 text-emerald-400" : "border-rose-500/40 text-rose-400")}>
                            {(step as any).isTrue ? "Doğru" : "Yanlış"}
                        </Badge>
                    </div>
                );
            case 'fitb':
                return (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="truncate max-w-[240px]">{(step as any).sentenceWithBlank}</span>
                        <span className="text-amber-400 font-bold text-[10px]">Cevap: {(step as any).correctAnswer}</span>
                    </div>
                );
            case 'sentenceScramble':
                return <span className="text-xs text-cyan-300 truncate block max-w-[280px]">Düzgün Cümle: {(step as any).correctSentence}</span>;
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
                return (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-orange-500/20 text-orange-300 border-orange-500/40">
                            🎮 {(step as any).activityLabel || (step as any).title}
                        </Badge>
                        <span className="text-xs text-slate-400 font-mono text-[10px]">{(step as any).activityType}</span>
                    </div>
                );
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
                            className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg" 
                            onClick={onDuplicate}
                            title="Klonla (Çoğalt)"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300 rounded-lg" 
                            onClick={onEdit}
                            title="Yapay Zekâ ile Düzenle / İyileştir"
                        >
                            <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                        </Button>

                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white rounded-lg" 
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
    onOpenGameSelector,
    onOpenRegisteredAssets,
    insertIndex 
}: { 
    onAddStep: (type: LessonStep['type'], title: string, atIndex?: number) => void;
    onOpenLibrary: (filter: any, multiSelect: boolean, stepType: any, atIndex?: number) => void;
    onOpenAi?: (atIndex: number) => void;
    onOpenGameSelector?: (atIndex: number) => void;
    onOpenRegisteredAssets?: () => void;
    insertIndex: number;
}) {
    return (
        <div className="relative py-2 group flex items-center justify-center">
            {/* Çizgi */}
            <div className="absolute inset-x-0 h-px bg-white/5 group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:via-indigo-500/50 group-hover:to-transparent transition-all duration-300" />
            
            {/* Yan Yana Butonlar */}
            <div className="relative z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 group-hover:scale-100 flex items-center gap-2">
                {/* 1. Anlatım Ekle */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button 
                            type="button"
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-indigo-500/40 text-indigo-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-400 text-xs font-bold shadow-lg shadow-indigo-950/80 cursor-pointer transition-all"
                        >
                            <Plus className="h-3.5 w-3.5" /> Anlatım Ekle
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-64 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-2 z-50 scrollbar-thin scrollbar-thumb-white/20">
                        <DropdownMenuItem 
                            onClick={() => onOpenAi?.(insertIndex)}
                            className="text-xs font-black text-yellow-300 focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-2 mb-1 bg-indigo-950/50 border border-indigo-500/30"
                        >
                            <Sparkles className="w-4 h-4 mr-2 text-yellow-400 animate-pulse" /> ✨ AI Stüdyosu ile Üret...
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                        <DropdownMenuLabel className="text-[11px] font-black uppercase text-indigo-400 tracking-wider px-2 py-1">Anlatım Adımları</DropdownMenuLabel>
                        {[
                            { label: '🤔 Giriş Sorusu (Dikkat Çekme)', type: 'hookQuestion' as LessonStep['type'], title: 'Derse Başlarken: Bir Düşünelim!' },
                            { label: '📊 Kategori & Tablo', type: 'categoryTable' as LessonStep['type'], title: 'Konu Sınıflandırma Tablosu' },
                            { label: '🪜 Adım Adım Süreç & Yol', type: 'processFlow' as LessonStep['type'], title: 'Adım Adım Yol Haritası' },
                            { label: '✏️ Defterimize Yazalım', type: 'notebookNote' as LessonStep['type'], title: 'Defterimize Yazalım' },
                            { label: '💡 Kavram Açıklamaları', type: 'conceptExplanation' as LessonStep['type'], title: 'Kavram Açıklamaları' },
                            { label: '🔲 4 Boyut Konu Matrisi', type: 'conceptMatrix' as LessonStep['type'], title: '4 Boyutta Konu Analizi' },
                            { label: '🎯 Öğrenme Hedefleri', type: 'objectiveList' as LessonStep['type'], title: 'Öğrenme Hedefleri' },
                            { label: '📑 Akordiyon Özet', type: 'accordion' as LessonStep['type'], title: 'Akordiyon Özet' },
                            { label: '📄 Metin & Cümleler', type: 'content' as LessonStep['type'], title: 'Metin İçeriği' },
                            { label: '🎬 Video Slaytı (YouTube)', type: 'video' as LessonStep['type'], title: 'Video Anlatım' },
                            { label: '🖼️ Görsel / Resim', type: 'visual' as LessonStep['type'], title: 'Görsel İnceleme' },
                            { label: '🌐 Web Simülasyonu (iFrame)', type: 'iframe' as LessonStep['type'], title: 'İnteraktif Simülasyon' },
                            { label: '💻 İnteraktif HTML Slayt', type: 'htmlSlide' as LessonStep['type'], title: 'İnteraktif Sunum' },
                        ].map(opt => (
                            <DropdownMenuItem 
                                key={opt.label} 
                                onClick={() => onAddStep(opt.type!, opt.title!, insertIndex)}
                                className="text-xs font-semibold focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                            >
                                {opt.label}
                            </DropdownMenuItem>
                        ))}
                        {onOpenLibrary && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10 my-1" />
                                <DropdownMenuLabel className="text-[11px] font-black uppercase text-amber-400 tracking-wider px-2 py-1">📚 Veri Bankasından</DropdownMenuLabel>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['concept'], true, 'conceptExplanation', insertIndex)}
                                    className="text-xs font-semibold text-cyan-300 focus:bg-cyan-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Veri Bankasından Kavram Kartları
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['definition'], true, 'flashcard', insertIndex)}
                                    className="text-xs font-semibold text-emerald-300 focus:bg-emerald-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-2 text-emerald-400" /> Veri Bankasından Bilgi Kartları
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['images'], true, 'visual', insertIndex)}
                                    className="text-xs font-semibold text-teal-300 focus:bg-teal-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <ImageIcon className="w-3.5 h-3.5 mr-2 text-teal-400" /> Arşivden Görsel Ekle...
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* 2. Değerlendirme Ekle */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button 
                            type="button"
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-purple-500/40 text-purple-300 hover:text-white hover:bg-purple-600 hover:border-purple-400 text-xs font-bold shadow-lg shadow-purple-950/80 cursor-pointer transition-all"
                        >
                            <Plus className="h-3.5 w-3.5" /> Değerlendirme Ekle
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-64 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-2 z-50 scrollbar-thin scrollbar-thumb-white/20">
                        <DropdownMenuLabel className="text-[11px] font-black uppercase text-purple-400 tracking-wider px-2 py-1">Soru & Değerlendirme</DropdownMenuLabel>
                        {[
                            { label: '🔘 Çoktan Seçmeli Soru', type: 'mcq' as LessonStep['type'], title: 'Kontrol Sorusu' },
                            { label: '✅/❌ Doğru / Yanlış Listesi', type: 'trueFalseList' as LessonStep['type'], title: 'Doğru/Yanlış Alıştırması' },
                            { label: '❓ Tekli Doğru / Yanlış', type: 'tf' as LessonStep['type'], title: 'Doğru/Yanlış' },
                            { label: '✏️ Boşluk Doldurma', type: 'fitb' as LessonStep['type'], title: 'Boşluk Doldurma' },
                            { label: '🔗 Kavram - Tanım Eşleştirme', type: 'matching' as LessonStep['type'], title: 'Kavram Eşleştirme' },
                            { label: '🎴 Bilgi Kartı (Flashcard)', type: 'flashcard' as LessonStep['type'], title: 'Bilgi Kartı' },
                            { label: '🔤 Anagram Kartları (Dokun & Çevir)', type: 'anagramFlashcard' as LessonStep['type'], title: 'Anagram Bilgi Kartı' },
                            { label: '🎮 Kelime Dehası (Anagram Oyunu)', type: 'anagramGame' as LessonStep['type'], title: 'Kelime Dehası' },
                            { label: '🧩 Karışık Cümle Tamamlama', type: 'sentenceScramble' as LessonStep['type'], title: 'Cümle Sıralama' },
                        ].map(opt => (
                            <DropdownMenuItem 
                                key={opt.label} 
                                onClick={() => onAddStep(opt.type!, opt.title!, insertIndex)}
                                className="text-xs font-semibold focus:bg-purple-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                            >
                                {opt.label}
                            </DropdownMenuItem>
                        ))}
                        {onOpenLibrary && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10 my-1" />
                                <DropdownMenuLabel className="text-[11px] font-black uppercase text-amber-400 tracking-wider px-2 py-1">📚 Veri Bankasından</DropdownMenuLabel>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['definition'], true, 'matching', insertIndex)}
                                    className="text-xs font-bold text-amber-300 focus:bg-amber-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-2 text-amber-400" /> Veri Bankasından Tanım Eşleştirme
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['concept'], true, 'anagramFlashcard', insertIndex)}
                                    className="text-xs font-bold text-fuchsia-300 focus:bg-fuchsia-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <Puzzle className="w-3.5 h-3.5 mr-2 text-fuchsia-400" /> 🔤 Veri Bankasından Anagram Kartları
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['concept'], true, 'anagramGame', insertIndex)}
                                    className="text-xs font-semibold text-purple-300 focus:bg-purple-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <Gamepad2 className="w-3.5 h-3.5 mr-2 text-purple-400" /> 🎮 Veri Bankasından Kelime Dehası
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['sentence'], true, 'sentenceScramble', insertIndex)}
                                    className="text-xs font-semibold text-cyan-300 focus:bg-cyan-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <Shuffle className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Veri Bankasından Cümle Sıralama
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['questions'], true, 'questions', insertIndex)}
                                    className="text-xs font-semibold text-indigo-300 focus:bg-indigo-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-2 text-indigo-400" /> Soru Bankasından Soru Seç...
                                </DropdownMenuItem>
                            </>
                        )}
                        {onOpenGameSelector && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10 my-1" />
                                <DropdownMenuItem 
                                    onClick={() => onOpenGameSelector?.(insertIndex)}
                                    className="text-xs font-bold text-orange-300 focus:bg-orange-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-2"
                                >
                                    <Gamepad2 className="w-4 h-4 mr-2 text-orange-400" /> 🎮 İnteraktif Oyun Ekle...
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}

// ══ ANA KONU DÜZENLEYİCİ BİLEŞENİ ══
export function TopicEditor({ 
    title, setTitle, steps, setSteps, sourceText, setSourceText, htmlContent, setHtmlContent,
    onSave, isSaving, isUnitFlow = false, onOpenAi, children
}: { 
    title: string, setTitle: (t: string) => void,
    steps: DraggableLessonStep[], setSteps: (s: DraggableLessonStep[] | ((prev: DraggableLessonStep[]) => DraggableLessonStep[])) => void,
    sourceText: string, setSourceText: (t: string) => void,
    htmlContent?: string, setHtmlContent?: (c: string) => void,
    onSave: () => Promise<void>,
    isSaving: boolean,
    isUnitFlow?: boolean,
    onOpenAi?: (targetIndex?: number) => void;
    children?: React.ReactNode;
}) {
    const [viewMode, setViewMode] = useState<'studio' | 'list'>('studio');
    const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<{ step: LessonStep; index: number } | null>(null);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
    const [isGameSelectorOpen, setIsGameSelectorOpen] = useState(false);
    const [isRegisteredAssetsOpen, setIsRegisteredAssetsOpen] = useState(false);
    const [insertAtIndex, setInsertAtIndex] = useState<number | undefined>(undefined);
    const [libraryConfig, setLibraryConfig] = useState<{ filter: any[]; multiSelect: boolean; stepType: any; targetIndex?: number }>({ filter: [], multiSelect: false, stepType: 'content' });
    
    const [quickPromptText, setQuickPromptText] = useState('');
    const [isQuickPromptGenerating, setIsQuickPromptGenerating] = useState(false);

    const { toast } = useToast();
    const searchParams = useSearchParams();
    const courseId = searchParams.get('courseId');
    const unitId = searchParams.get('unitId');
    const topicId = searchParams.get('topicId');
    
    const context = useMemo(() => ({
        courseId: courseId || undefined,
        unitId: unitId || undefined,
        topicId: topicId || undefined,
        topicTitle: title || undefined,
        sourceText: sourceText || undefined,
    }), [courseId, unitId, topicId, title, sourceText]);

    useEffect(() => {
        if (steps.length > 0 && selectedStepIndex >= steps.length) {
            setSelectedStepIndex(steps.length - 1);
        }
    }, [steps.length, selectedStepIndex]);
    
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

    const handleQuickPromptGenerate = async () => {
        const prompt = quickPromptText.trim();
        if (!prompt) return;

        setIsQuickPromptGenerating(true);
        try {
            const result = await generateCustomPromptStep({
                userPrompt: prompt,
                topicTitle: title || 'Ders Konusu',
                sourceText: sourceText.trim() || undefined,
            });

            if (result.steps && result.steps.length > 0) {
                const newStepsWithIds: DraggableLessonStep[] = result.steps.map((step, idx) => ({
                    ...step,
                    id: (step as any).id || `step-${Date.now()}-${idx}-${Math.random()}`
                }));
                setSteps(prev => [...prev, ...newStepsWithIds]);
                setQuickPromptText('');
                toast({
                    title: "✅ Slayt Başarıyla Eklendi",
                    description: result.message,
                });
            }
        } catch (err: any) {
            toast({
                title: "Üretim Hatası",
                description: err.message || "Slayt üretilirken bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsQuickPromptGenerating(false);
        }
    };

    const handleAddStep = (type: LessonStep['type'], defaultTitle: string, atIndex?: number) => {
        let newStep: LessonStep;

        switch(type) {
            case 'hookQuestion': newStep = { type, title: defaultTitle || '🤔 Derse Başlarken: Bir Düşünelim!', question: 'Bu konuyla ilgili merak uyandırıcı ve düşündürücü soru metni...', thoughtStarter: 'Arkadaşlarınızla tartışın: Sizce bu kavram günlük hayatımızı nasıl etkiler?', tag: '🤔 Derse Başlarken: Bir Düşünelim!' }; break;
            case 'notebookNote':
                newStep = {
                    type: 'notebookNote',
                    title: defaultTitle || '✏️ Defterimize Yazalım',
                    noteTitle: 'Dersin En Önemli Özet Maddeleri',
                    notes: [
                        '1. Konuyla ilgili deftere yazılacak 1. kural...',
                        '2. Konuyla ilgili deftere yazılacak 2. kural...',
                        '3. Konuyla ilgili deftere yazılacak 3. kural...'
                    ],
                    suggestedMinutes: 3
                };
                break;
            case 'processFlow':
                newStep = {
                    type: 'processFlow',
                    title: defaultTitle || '🪜 Adım Adım Yol Haritası & Süreç',
                    steps: [
                        { stepNumber: 1, title: '1. Aşama', description: 'Birinci aşamanın açıklaması...' },
                        { stepNumber: 2, title: '2. Aşama', description: 'İkinci aşamanın açıklaması...' },
                        { stepNumber: 3, title: '3. Aşama', description: 'Üçüncü aşamanın açıklaması...' }
                    ]
                };
                break;
            case 'conceptMatrix':
                newStep = {
                    type: 'conceptMatrix',
                    title: defaultTitle || '🔲 4 Boyutta Konu Analizi',
                    topicName: 'Ders Konusu',
                    quadrants: [
                        { label: '1. Nedir? (Tanım)', content: 'Temel tanım ve kavram...' },
                        { label: '2. Niçin Önemlidir? (Amaç)', content: 'Önemi ve hikmeti...' },
                        { label: '3. Nasıl Uygulanır? (Pratik)', content: 'Hayata geçirilme biçimi...' },
                        { label: '4. Bize Ne Kazandırır? (Fayda)', content: 'Bireysel ve toplumsal sonuçları...' }
                    ]
                };
                break;
            case 'categoryTable':
                newStep = {
                    type: 'categoryTable',
                    title: defaultTitle || '📊 Konu Sınıflandırma Tablosu',
                    tableTitle: 'Konu Sınıflandırma Tablosu',
                    description: 'Konunun temel türleri ve kategorileri',
                    categories: [
                        { name: '1. Kategori (Örn: Farz)', badge: 'Zorunlu', color: 'emerald', items: ['Örnek madde 1', 'Örnek madde 2', 'Örnek madde 3'] },
                        { name: '2. Kategori (Örn: Vacip)', badge: 'Kuvvetli Emir', color: 'amber', items: ['Örnek madde 1', 'Örnek madde 2'] },
                        { name: '3. Kategori (Örn: Sünnet)', badge: 'Müstehap', color: 'indigo', items: ['Örnek madde 1', 'Örnek madde 2'] }
                    ]
                };
                break;
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
            case 'htmlSlide': newStep = { type: 'htmlSlide', title: 'İnteraktif Sunum', htmlContent: '<div class="p-8 bg-slate-900 rounded-3xl text-white text-center"><h1 class="text-3xl font-black mb-4">Başlık</h1><p class="text-slate-300">İçerik buraya gelecek.</p></div>' }; break;
            case 'video': newStep = { type, title: defaultTitle, url: 'https://www.youtube.com/embed/...' }; break;
            case 'activityLink': 
                newStep = {
                    type: 'activityLink',
                    title: 'Yeni Etkinlik',
                    activityType: '/oyunlar/kelime-avi/oyun',
                    activityLabel: 'Kelime Avı',
                    courseId: context?.courseId,
                    unitId: context?.unitId,
                    topicId: context?.topicId,
                };
                break;
            case 'matching':
            case 'conceptMatching':
                newStep = {
                    type: 'matching',
                    title: defaultTitle || 'Kavram - Tanım Eşleştirme',
                    pairs: [
                        { concept: 'Kavram 1', definition: 'Birinci kavramın açıklaması ve tanımı...' },
                        { concept: 'Kavram 2', definition: 'İkinci kavramın açıklaması ve tanımı...' },
                        { concept: 'Kavram 3', definition: 'Üçüncü kavramın açıklaması ve tanımı...' }
                    ]
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
        if (atIndex !== undefined) {
            setSelectedStepIndex(atIndex);
        } else {
            setSelectedStepIndex(steps.length);
        }
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
        setSelectedStepIndex(index + 1);
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

    const handleAddSteps = (newSteps: LessonStep[]) => {
        const newStepsWithIds = newSteps.map((step, index) => ({
            ...step,
            id: `step-${Date.now()}-${index}-${Math.random()}`
        }));
        setSteps(currentSteps => [...currentSteps, ...newStepsWithIds]);
    };

    const handleAutoBuild10StepFlow = (autoSteps: LessonStep[]) => {
        const stepsWithIds = autoSteps.map((step, index) => ({
            ...step,
            id: `step-${Date.now()}-${index}-${Math.random()}`
        }));
        setSteps(stepsWithIds);
    };

    const handleGameSelected = (gameStep: ActivityLinkStep) => {
        const stepWithId: DraggableLessonStep = {
            ...gameStep,
            id: `step-${Date.now()}-${Math.random()}`
        };

        setSteps(currentSteps => {
            if (insertAtIndex !== undefined && insertAtIndex >= 0 && insertAtIndex <= currentSteps.length) {
                const updated = [...currentSteps];
                updated.splice(insertAtIndex, 0, stepWithId);
                return updated;
            }
            return [...currentSteps, stepWithId];
        });
        setInsertAtIndex(undefined);
        toast({ title: "Oyun Eklendi", description: `"${gameStep.activityLabel}" oyunu sunum adımı olarak eklendi.` });
    };

    const handleOpenLibrary = (filter: any[], multiSelect: boolean, stepType: any, atIndex?: number) => {
        setLibraryConfig({ filter, multiSelect, stepType, targetIndex: atIndex });
        setTimeout(() => setIsLibraryPanelOpen(true), 10);
    };

    const handleItemsImportedFromLibrary = (items: any[], stepType: any) => {
        if (!items || items.length === 0) return;

        let generatedSteps: LessonStep[] = [];

        if (stepType === 'matching' || stepType === 'conceptMatching') {
            const pairs = items.map(item => {
                const act = item as ActivityItem;
                const concept = act.content?.term || (act as any).term || act.content?.text || (act as any).concept || (act as any).title || '';
                const definition = act.content?.definition || (act as any).definition || '';
                return { concept: String(concept).trim(), definition: String(definition).trim() };
            }).filter(p => p.concept && p.definition);

            if (pairs.length > 0) {
                generatedSteps = [{
                    type: 'matching',
                    title: 'Kavram - Tanım Eşleştirme',
                    pairs
                }];
            }
        } else if (stepType === 'keyConcepts' || stepType === 'conceptExplanation') {
            const concItems = items.map(item => {
                const act = item as ActivityItem;
                const concept = act.content?.term || (act as any).term || act.content?.text || (act as any).concept || 'Kavram';
                const definition = act.content?.definition || (act as any).definition || '';
                return { concept: String(concept).trim(), definition: String(definition).trim() };
            });
            generatedSteps = [{
                type: 'conceptExplanation',
                title: 'Anahtar Kavramlar',
                items: concItems
            }];
        } else if (stepType === 'flashcard') {
            const cards = items.map(item => {
                const act = item as ActivityItem;
                const term = act.content?.term || (act as any).term || act.content?.text || (act as any).title || 'Terim';
                const definition = act.content?.definition || (act as any).definition || '';
                return { term: String(term).trim(), definition: String(definition).trim() };
            });
            generatedSteps = [{
                type: 'flashcard',
                title: 'Bilgi Kartları',
                cards
            }];
        } else if (stepType === 'anagramGame' || stepType === 'anagramFlashcard') {
            const cards = items.map(item => {
                const act = item as ActivityItem;
                const term = act.content?.term || act.content?.text || (act as any).text || (act as any).term || (act as any).concept || (act as any).title || '';
                const cleanWord = cleanForAnagram(term);
                const def = act.content?.definition || (act as any).definition;
                return {
                    definition: def ? def : `Bu kavramın harflerini doğru sıralayarak kelimeyi bulun: "${term}"`,
                    correctAnswer: cleanWord,
                    scrambledWord: scrambleAnagramWord(cleanWord)
                };
            }).filter(c => c.correctAnswer && c.correctAnswer.length > 0);
            if (cards.length > 0) {
                generatedSteps = [{
                    type: stepType === 'anagramFlashcard' ? 'anagramFlashcard' : 'anagramGame',
                    title: stepType === 'anagramFlashcard' ? 'Anagram Kartları' : 'Kelime Dehası',
                    cards
                }];
            }
        } else if (stepType === 'sentenceScramble') {
            generatedSteps = items.map(item => {
                const act = item as ActivityItem;
                const sentence = act.content?.text || (act as any).title || '';
                const scrambled = sentence.split(' ').sort(() => Math.random() - 0.5).join(' ');
                return {
                    type: 'sentenceScramble',
                    title: 'Cümle Düzeltme',
                    correctSentence: sentence,
                    scrambledSentence: scrambled
                };
            });
        } else if (stepType === 'questions') {
            generatedSteps = items.map(item => {
                const q = item as Question;
                if (q.type === 'Doğru/Yanlış') {
                    return {
                        type: 'tf',
                        title: 'Doğru / Yanlış',
                        statement: q.text,
                        isTrue: q.correctAnswer === 'Doğru'
                    };
                } else if (q.type === 'Boşluk Doldurma') {
                    return {
                        type: 'fitb',
                        title: 'Boşluk Doldurma',
                        sentenceWithBlank: q.text,
                        options: q.options || [],
                        correctAnswer: q.correctAnswer || ''
                    };
                } else {
                    return {
                        type: 'mcq',
                        title: 'Kontrol Sorusu',
                        question: q.text,
                        options: q.options || ['A', 'B', 'C', 'D'],
                        correctAnswer: q.correctAnswer || (q.options ? q.options[0] : 'A')
                    };
                }
            });
        } else if (stepType === 'visual') {
            generatedSteps = items.map(item => ({
                type: 'visual',
                title: (item as ImageAsset).title || 'Görsel',
                imageUrl: (item as ImageAsset).url
            }));
        }

        const newStepsWithIds = generatedSteps.map((step, index) => ({
            ...step,
            id: `step-${Date.now()}-${index}-${Math.random()}`
        }));

        setSteps(currentSteps => {
            const targetIdx = libraryConfig.targetIndex;
            if (targetIdx !== undefined && targetIdx >= 0 && targetIdx <= currentSteps.length) {
                const updated = [...currentSteps];
                updated.splice(targetIdx, 0, ...newStepsWithIds);
                return updated;
            }
            return [...currentSteps, ...newStepsWithIds];
        });
        setIsLibraryPanelOpen(false);
        toast({ 
            title: "Adım Eklendi", 
            description: `${newStepsWithIds.length} adet adım başarıyla eklendi.` 
        });
    };

    const handleImportSavedTopicNotes = async () => {
        let notesList: string[] = [];
        let definitionsList: { concept: string; definition: string; }[] = [];

        if (courseId && unitId && topicId) {
            try {
                // 1. Topic içindeki writingContent.notes ve conceptDefinitions çek
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (topicSnap.exists()) {
                    const tData = topicSnap.data() as Topic;
                    if (tData.writingContent?.notes && tData.writingContent.notes.length > 0) {
                        notesList = tData.writingContent.notes;
                    }
                    if (tData.writingContent?.conceptDefinitions && tData.writingContent.conceptDefinitions.length > 0) {
                        definitionsList = tData.writingContent.conceptDefinitions;
                    }
                }

                // 2. activityItems koleksiyonundaki tanımları çek (yedek kaynak)
                if (definitionsList.length === 0) {
                    const q = query(
                        collection(db, "activityItems"),
                        where("topicId", "==", topicId),
                        where("type", "==", "definition")
                    );
                    const querySnapshot = await getDocs(q);
                    definitionsList = querySnapshot.docs.map(doc => {
                        const item = doc.data() as ActivityItem;
                        return {
                            concept: item.content?.term || (item as any)?.title || '',
                            definition: item.content?.definition || ''
                        };
                    }).filter(item => item.concept && item.definition);
                }
            } catch (e) {
                console.error("Notlar ve kavramlar çekilirken hata:", e);
            }
        }

        if (notesList.length === 0 && definitionsList.length === 0) {
            toast({
                title: "Kayıtlı Veri Bulunamadı",
                description: "Bu konu için henüz 'Yazılacaklar' (Kavram veya Defter Notu) kaydedilmemiş. Yapay Zekâ ile üretebilirsiniz.",
                variant: "destructive"
            });
            return;
        }

        const newStep: NotebookNoteStep = {
            type: 'notebookNote',
            title: '✏️ Defterimize Yazalım (Kavramlar & Notlar)',
            noteTitle: `${title ? title + ' - ' : ''}Önemli Ders Notları & Anahtar Kavramlar`,
            notes: notesList,
            conceptDefinitions: definitionsList.length > 0 ? definitionsList : undefined,
            suggestedMinutes: Math.min(10, Math.max(3, Math.ceil(notesList.length * 0.8))),
            isPublished: true
        };

        const stepWithId: DraggableLessonStep = {
            ...newStep,
            id: `step-${Date.now()}-${Math.random()}`
        };

        setSteps(prev => [...prev, stepWithId]);
        toast({
            title: "Defter Notu Eklendi",
            description: `Konunun ${definitionsList.length} kavramı ve ${notesList.length} defter notu tam ekran sunum düzenine aktarıldı.`
        });
    };

    const anlatimStepOptions: { label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void }[] = [
        { label: '🤔 Merak & Giriş Sorusu (Dikkat Çekme)', type: 'hookQuestion', defaultTitle: 'Derse Başlarken: Bir Düşünelim!' },
        { label: '📋 Veri Bankası: Kayıtlı Defter Notları & Kavramlar (Yazılacaklar)', action: handleImportSavedTopicNotes },
        { label: '✏️ Defterimize Yazalım (Manuel Not Ekle)', type: 'notebookNote', defaultTitle: 'Defterimize Yazalım' },
        { label: '🪜 Adım Adım Yol Haritası & Süreç', type: 'processFlow', defaultTitle: 'Adım Adım Yol Haritası & Süreç' },
        { label: '🔲 4 Boyutta Konu Matrisi', type: 'conceptMatrix', defaultTitle: '4 Boyutta Konu Analizi' },
        { label: '📊 Kategori & Sınıflandırma Tablosu (Farz/Vacip/Sünnet vb.)', type: 'categoryTable', defaultTitle: '📊 Konu Sınıflandırma Tablosu' },
        { label: 'Metin İçeriği', type: 'content', defaultTitle: 'Metin İçeriği' },
        { label: 'Öğrenme Hedefleri', type: 'objectiveList', defaultTitle: 'Öğrenme Hedefleri' },
        { label: 'Kavram Açıklamaları', type: 'conceptExplanation', defaultTitle: 'Kavram Açıklamaları' },
        { label: 'Bilgi Kartları', type: 'flashcard', defaultTitle: 'Bilgi Kartları' },
        { label: 'Görsel / Şema', type: 'visual', defaultTitle: 'Görsel' },
        { label: 'Video', type: 'video', defaultTitle: 'Video' },
        { label: 'İnteraktif HTML Slayt', type: 'htmlSlide', defaultTitle: 'İnteraktif Sunum' },
        { label: 'Akordiyon Özet', type: 'accordion', defaultTitle: 'Konu Özeti' },
        { label: 'Veri Bankası: Tanım Kartları', action: () => handleOpenLibrary(['definition'], true, 'keyConcepts') },
        { label: 'Veri Bankası: Bilgi Kartları', action: () => handleOpenLibrary(['definition'], true, 'flashcard') },
        { label: 'Arşivden Görsel Ekle', action: () => handleOpenLibrary(['images'], true, 'visual') },
    ];

    const degerlendirmeStepOptions: { label: string, type?: LessonStep['type'], defaultTitle?: string, action?: () => void }[] = [
        { label: 'Kavram - Tanım Eşleştirme', type: 'matching', defaultTitle: 'Kavram Eşleştirme' },
        { label: 'Veri Bankasından Eşleştirme Ekle', action: () => handleOpenLibrary(['definition'], true, 'matching') },
        { label: 'Çoktan Seçmeli Soru', type: 'mcq', defaultTitle: 'Kontrol Sorusu' },
        { label: 'Doğru / Yanlış', type: 'tf', defaultTitle: 'Doğru/Yanlış' },
        { label: 'Doğru / Yanlış Listesi', type: 'trueFalseList', defaultTitle: 'Doğru/Yanlış Alıştırması' },
        { label: 'Boşluk Doldurma', type: 'fitb', defaultTitle: 'Boşluk Doldurma' },
        { label: 'Kelime Dehası / Anagram', type: 'anagramGame', defaultTitle: 'Kelime Dehası' },
        { label: 'Cümle Düzeltme (Karışık Cümle)', type: 'sentenceScramble', defaultTitle: 'Cümle Düzeltme' },
        { label: 'Soru Bankasından Soru Ekle', action: () => handleOpenLibrary(['questions'], true, 'questions') },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
            <div className="w-full px-3 sm:px-4 lg:px-6 space-y-4">
                
                {/* ══ STÜDYO ÜST ARAÇ ÇUBUĞU ══ */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-3xl shadow-2xl sticky top-4 z-40">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Link href="/teacher/content-creation">
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                                    {isUnitFlow ? 'Ünite Akışı Stüdyosu' : 'Sunum & Ders Stüdyosu'}
                                </span>
                                <Badge variant="outline" className="text-[9px] bg-slate-950 border-white/10 text-slate-400">
                                    {steps.length} Slayt
                                </Badge>
                            </div>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ders Başlığı..."
                                className="text-lg sm:text-xl font-black bg-transparent border-0 p-0 h-auto text-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap items-center w-full md:w-auto justify-end">
                        
                        {/* Görünüm Modu Switcher: 🖥️ Stüdyo vs 📋 Liste */}
                        <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-white/10 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setViewMode('studio')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    viewMode === 'studio'
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/60"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <Monitor className="w-3.5 h-3.5" /> Stüdyo
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                                    viewMode === 'list'
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/60"
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <ListFilter className="w-3.5 h-3.5" /> Liste
                            </button>
                        </div>

                        {/* ⋯ Diğer Araçlar — overflow menü */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="border-white/15 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold text-xs h-9">
                                    ⋯ Araçlar
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-60 rounded-2xl shadow-2xl p-2 z-50">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-2 pb-1">Ders Kurulum Araçları</DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() => setIsRegisteredAssetsOpen(true)}
                                    className="text-xs font-bold text-amber-300 focus:bg-amber-600/20 focus:text-white rounded-xl cursor-pointer px-2.5 py-2"
                                >
                                    <Wand2 className="w-4 h-4 mr-2 text-amber-400" /> ⚡ 10 Adımlık Dersi Otomatik Kur
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setIsRegisteredAssetsOpen(true)}
                                    className="text-xs font-semibold focus:bg-indigo-600 focus:text-white rounded-xl cursor-pointer px-2.5 py-2"
                                >
                                    <BookOpen className="w-4 h-4 mr-2 text-indigo-400" /> Konu Varlıkları Çekmecesi
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10 my-1" />
                                <DropdownMenuItem
                                    onClick={() => { setInsertAtIndex(undefined); setIsGameSelectorOpen(true); }}
                                    className="text-xs font-semibold focus:bg-orange-600 focus:text-white rounded-xl cursor-pointer px-2.5 py-2"
                                >
                                    <Gamepad2 className="w-4 h-4 mr-2 text-orange-400" /> Oyun / Etkinlik Ekle
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10 my-1" />
                                <DropdownMenuItem
                                    onClick={() => setIsBulkImportOpen(true)}
                                    className="text-xs font-semibold focus:bg-slate-700 focus:text-white rounded-xl cursor-pointer px-2.5 py-2"
                                >
                                    <Upload className="w-4 h-4 mr-2 text-slate-400" /> Toplu İçe Aktarma
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button 
                            variant="secondary" 
                            onClick={() => setIsPreviewOpen(true)} 
                            className="bg-slate-800 text-white hover:bg-slate-700 border border-white/10 shadow-md rounded-xl text-xs font-bold h-9"
                        >
                            <Eye className="mr-1.5 h-3.5 w-3.5 text-cyan-400" /> Önizle
                        </Button>

                        <Button 
                            onClick={() => onOpenAi?.()}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-950/40 rounded-xl text-xs font-black cursor-pointer h-9"
                        >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-yellow-300 animate-pulse" /> AI Stüdyosu
                        </Button>

                        <Button 
                            onClick={onSave} 
                            disabled={isSaving} 
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-40 text-xs px-5 h-9"
                        >
                            {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                            Kaydet
                        </Button>
                    </div>
                </div>

                {children}

                {/* ══ 1. STÜDYO MODU (PowerPoint / Canva Tarzı Boyutlandırılabilir & Gizlenebilir 3 Panelli Workspace) ══ */}
                {viewMode === 'studio' ? (
                    <ResizableStudioLayout
                        defaultLeftWidth={280}
                        defaultRightWidth={380}
                        leftTitle="Slaytlar"
                        rightTitle="Düzenleyici"
                        leftPanel={
                            <SlideFilmstrip
                                steps={steps}
                                selectedIndex={selectedStepIndex}
                                onSelectIndex={setSelectedStepIndex}
                                onReorderSteps={(oldIdx, newIdx) => {
                                    setSteps(items => arrayMove(items, oldIdx, newIdx));
                                    setSelectedStepIndex(newIdx);
                                }}
                                onAddStep={handleAddStep}
                                onDuplicateStep={handleDuplicateStep}
                                onDeleteStep={handleDeleteStep}
                                onTogglePublishStep={handleTogglePublishStep}
                                onOpenAi={onOpenAi}
                                onOpenGameSelector={(idx) => {
                                    setInsertAtIndex(idx);
                                    setTimeout(() => setIsGameSelectorOpen(true), 10);
                                }}
                                onOpenRegisteredAssets={() => setTimeout(() => setIsRegisteredAssetsOpen(true), 10)}
                                onOpenLibrary={handleOpenLibrary}
                            />
                        }
                        centerPanel={
                            <SlideCanvas
                                steps={steps}
                                selectedIndex={selectedStepIndex}
                                onSelectIndex={setSelectedStepIndex}
                                topicTitle={title}
                                courseTitle={context?.topicTitle || 'Ders'}
                                unitTitle=""
                                onOpenFullscreenPreview={() => setIsPreviewOpen(true)}
                                onOpenAi={() => onOpenAi?.(selectedStepIndex)}
                            />
                        }
                        rightPanel={
                            <SlideInspector
                                step={steps[selectedStepIndex] || null}
                                onUpdateStep={(updatedStep) => {
                                    setSteps(currentSteps => {
                                        const newSteps = [...currentSteps];
                                        newSteps[selectedStepIndex] = updatedStep;
                                        return newSteps;
                                    });
                                }}
                                sourceText={sourceText}
                                setSourceText={setSourceText}
                                htmlContent={htmlContent}
                                setHtmlContent={setHtmlContent}
                                topicTitle={title}
                                courseId={context?.courseId}
                                unitId={context?.unitId}
                                topicId={context?.topicId}
                            />
                        }
                    />
                ) : (
                    /* ══ 2. LİSTE MODU (Klasik Kart Görünümü) ══ */
                    <div className="flex gap-5 items-start">
                        {/* SOL: ADIM LİSTESİ */}
                        <div className="flex-1 min-w-0 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 pb-1 border-b border-white/8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30 text-purple-400">
                                        <Layers className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-white">Ders Akışı Adımları</h2>
                                        <p className="text-[11px] text-slate-500">Sürükle-bırak ile sırala • Aralarına tıklayarak yeni adım ekle</p>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] bg-slate-950 border-purple-500/20 text-purple-300">
                                        {steps.length} adım
                                    </Badge>
                                </div>

                                {/* ══ HIZLI ADIM EKLEME BUTONLARI (Anlatım Ekle & Değerlendirme Ekle & Oyun Ekle) ══ */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Anlatım Ekle Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl h-8 px-3 shadow-md shadow-indigo-950/50 cursor-pointer">
                                                <Plus className="h-3.5 w-3.5 mr-1" /> Anlatım Ekle
                                                <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-64 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-2 z-50 scrollbar-thin scrollbar-thumb-white/20">
                                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-indigo-400 tracking-wider px-2 py-1">Anlatım Slaytı Türleri</DropdownMenuLabel>
                                            {[
                                                { label: '🤔 Giriş Sorusu (Dikkat Çekme)', type: 'hookQuestion' as LessonStep['type'], title: 'Derse Başlarken: Bir Düşünelim!' },
                                                { label: '📊 Kategori & Tablo', type: 'categoryTable' as LessonStep['type'], title: 'Konu Sınıflandırma Tablosu' },
                                                { label: '🪜 Adım Adım Süreç & Yol', type: 'processFlow' as LessonStep['type'], title: 'Adım Adım Yol Haritası' },
                                                { label: '✏️ Defterimize Yazalım', type: 'notebookNote' as LessonStep['type'], title: 'Defterimize Yazalım' },
                                                { label: '💡 Kavram Açıklamaları', type: 'conceptExplanation' as LessonStep['type'], title: 'Kavram Açıklamaları' },
                                                { label: '🔲 4 Boyut Konu Matrisi', type: 'conceptMatrix' as LessonStep['type'], title: '4 Boyutta Konu Analizi' },
                                                { label: '🎯 Öğrenme Hedefleri', type: 'objectiveList' as LessonStep['type'], title: 'Öğrenme Hedefleri' },
                                                { label: '📑 Akordiyon Özet', type: 'accordion' as LessonStep['type'], title: 'Akordiyon Özet' },
                                                { label: '📄 Metin & Cümleler', type: 'content' as LessonStep['type'], title: 'Metin İçeriği' },
                                                { label: '🎬 Video Slaytı (YouTube)', type: 'video' as LessonStep['type'], title: 'Video Anlatım' },
                                                { label: '🖼️ Görsel / Resim', type: 'visual' as LessonStep['type'], title: 'Görsel İnceleme' },
                                                { label: '🌐 Web Simülasyonu (iFrame)', type: 'iframe' as LessonStep['type'], title: 'İnteraktif Simülasyon' },
                                                { label: '💻 İnteraktif HTML Slayt', type: 'htmlSlide' as LessonStep['type'], title: 'İnteraktif Sunum' },
                                            ].map(opt => (
                                                <DropdownMenuItem
                                                    key={opt.label}
                                                    onClick={() => handleAddStep(opt.type, opt.title)}
                                                    className="text-xs font-semibold focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                                >
                                                    {opt.label}
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator className="bg-white/10 my-1" />
                                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-amber-400 tracking-wider px-2 py-1">📚 Veri Bankasından</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenLibrary(['concept'], true, 'conceptExplanation')}
                                                className="text-xs font-bold text-cyan-300 focus:bg-cyan-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                            >
                                                <BookOpen className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Veri Bankasından Kavram Kartları
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenLibrary(['definition'], true, 'flashcard')}
                                                className="text-xs font-bold text-emerald-300 focus:bg-emerald-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                            >
                                                <BookOpen className="w-3.5 h-3.5 mr-2 text-emerald-400" /> Veri Bankasından Bilgi Kartları
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenLibrary(['images'], true, 'visual')}
                                                className="text-xs font-bold text-teal-300 focus:bg-teal-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                            >
                                                <ImageIcon className="w-3.5 h-3.5 mr-2 text-teal-400" /> Arşivden Görsel Ekle...
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Değerlendirme Ekle Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl h-8 px-3 shadow-md shadow-purple-950/50 cursor-pointer">
                                                <Plus className="h-3.5 w-3.5 mr-1" /> Değerlendirme Ekle
                                                <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-64 max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl p-2 z-50 scrollbar-thin scrollbar-thumb-white/20">
                                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-purple-400 tracking-wider px-2 py-1">Soru & Değerlendirme Türleri</DropdownMenuLabel>
                                            {[
                                                { label: '🔘 Çoktan Seçmeli Soru', type: 'mcq' as LessonStep['type'], title: 'Kontrol Sorusu' },
                                                { label: '✅/❌ Doğru / Yanlış Listesi', type: 'trueFalseList' as LessonStep['type'], title: 'Doğru/Yanlış Alıştırması' },
                                                { label: '❓ Tekli Doğru / Yanlış', type: 'tf' as LessonStep['type'], title: 'Doğru/Yanlış' },
                                                { label: '✏️ Boşluk Doldurma', type: 'fitb' as LessonStep['type'], title: 'Boşluk Doldurma' },
                                                { label: '🔗 Kavram - Tanım Eşleştirme', type: 'matching' as LessonStep['type'], title: 'Kavram Eşleştirme' },
                                                { label: '🎴 Bilgi Kartı (Flashcard)', type: 'flashcard' as LessonStep['type'], title: 'Bilgi Kartı' },
                                                { label: '🔤 Kelime Dehası (Anagram)', type: 'anagramGame' as LessonStep['type'], title: 'Kelime Dehası' },
                                                { label: '🔤 Anagram Bilgi Kartı', type: 'anagramFlashcard' as LessonStep['type'], title: 'Anagram Bilgi Kartı' },
                                                { label: '🧩 Karışık Cümle Tamamlama', type: 'sentenceScramble' as LessonStep['type'], title: 'Cümle Sıralama' },
                                            ].map(opt => (
                                                <DropdownMenuItem
                                                    key={opt.label}
                                                    onClick={() => handleAddStep(opt.type, opt.title)}
                                                    className="text-xs font-semibold focus:bg-purple-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                                >
                                                    {opt.label}
                                                </DropdownMenuItem>
                                            ))}
                                            <DropdownMenuSeparator className="bg-white/10 my-1" />
                                            <DropdownMenuLabel className="text-[10px] font-black uppercase text-amber-400 tracking-wider px-2 py-1">📚 Veri Bankasından</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenLibrary(['definition'], true, 'matching')}
                                                className="text-xs font-bold text-amber-300 focus:bg-amber-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                            >
                                                <BookOpen className="w-3.5 h-3.5 mr-2 text-amber-400" /> 📚 Veri Bankasından Tanım Eşleştirme
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenLibrary(['concept'], true, 'anagramFlashcard')}
                                                className="text-xs font-bold text-fuchsia-300 focus:bg-fuchsia-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                            >
                                                <Puzzle className="w-3.5 h-3.5 mr-2 text-fuchsia-400" /> 🔤 Veri Bankasından Anagram Kartları (Dokun & Çevir)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenLibrary(['concept'], true, 'anagramGame')}
                                                className="text-xs font-semibold text-purple-300 focus:bg-purple-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                            >
                                                <Gamepad2 className="w-3.5 h-3.5 mr-2 text-purple-400" /> 🎮 Veri Bankasından Kelime Dehası (Oyun)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenLibrary(['sentence'], true, 'sentenceScramble')}
                                                className="text-xs font-bold text-cyan-300 focus:bg-cyan-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                            >
                                                <Shuffle className="w-3.5 h-3.5 mr-2 text-cyan-400" /> 🧩 Veri Bankasından Cümle Sıralama
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => handleOpenLibrary(['questions'], true, 'questions')}
                                                className="text-xs font-bold text-indigo-300 focus:bg-indigo-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                            >
                                                <BookOpen className="w-3.5 h-3.5 mr-2 text-indigo-400" /> ❓ Soru Bankasından Soru Seç...
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Oyun Ekle Butonu */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setInsertAtIndex(undefined); setIsGameSelectorOpen(true); }}
                                        className="border-orange-500/30 text-orange-300 hover:bg-orange-600/20 hover:text-white rounded-xl h-8 px-3 text-xs font-bold bg-orange-950/30 cursor-pointer"
                                    >
                                        <Gamepad2 className="h-3.5 w-3.5 mr-1 text-orange-400" /> Oyun Ekle
                                    </Button>
                                </div>
                            </div>

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={steps.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-0">
                                        <InsertStepDivider 
                                            insertIndex={0}
                                            onAddStep={handleAddStep}
                                            onOpenLibrary={handleOpenLibrary}
                                            onOpenAi={onOpenAi}
                                            onOpenGameSelector={(idx) => {
                                                setInsertAtIndex(idx);
                                                setTimeout(() => setIsGameSelectorOpen(true), 10);
                                            }}
                                            onOpenRegisteredAssets={() => setTimeout(() => setIsRegisteredAssetsOpen(true), 10)}
                                        />

                                        {steps.length > 0 ? (
                                            <>
                                                {steps.map((step, index) => (
                                                    <div key={step.id}>
                                                        <StepCard
                                                            id={step.id}
                                                            step={step}
                                                            order={index + 1}
                                                            isFirst={index === 0}
                                                            isLast={index === steps.length - 1}
                                                            onEdit={() => handleOpenEditor(index)}
                                                            onDelete={() => handleDeleteStep(index)}
                                                            onDuplicate={() => handleDuplicateStep(index)}
                                                            onMoveUp={() => handleMoveStep(index, 'up')}
                                                            onMoveDown={() => handleMoveStep(index, 'down')}
                                                            onTogglePublish={() => handleTogglePublishStep(index)}
                                                        />
                                                        
                                                        <InsertStepDivider 
                                                            insertIndex={index + 1}
                                                            onAddStep={handleAddStep}
                                                            onOpenLibrary={handleOpenLibrary}
                                                            onOpenAi={onOpenAi}
                                                            onOpenGameSelector={(idx) => {
                                                                setInsertAtIndex(idx);
                                                                setTimeout(() => setIsGameSelectorOpen(true), 10);
                                                            }}
                                                            onOpenRegisteredAssets={() => setTimeout(() => setIsRegisteredAssetsOpen(true), 10)}
                                                        />
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/40 text-slate-500 text-center p-6">
                                                <Wand2 className="h-16 w-16 mb-4 text-orange-400 opacity-40 animate-pulse" />
                                                <p className="text-xl font-bold text-white mb-1">Ders akışı henüz boş.</p>
                                                <p className="text-xs text-slate-400 max-w-md mb-6">
                                                    Yukarıdaki <strong>"⚡ 10 Adımlık Dersi Kur"</strong> butonuna basarak tam ders akışınızı oluşturabilirsiniz.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* SAĞ SIDEBAR (Kompakt) */}
                        <div className="hidden lg:flex flex-col gap-4 w-80 xl:w-96 flex-shrink-0 sticky top-24 self-start">
                            <Card className="bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-lg overflow-hidden rounded-2xl">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
                                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                        <FileText className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-xs font-black text-white flex-1">Kaynak Metin</span>
                                    {sourceText && (
                                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                                            {sourceText.trim().split(/\s+/).filter(Boolean).length} kelime
                                        </span>
                                    )}
                                </div>
                                <div className="p-3">
                                    <Textarea 
                                        value={sourceText} 
                                        onChange={(e) => setSourceText(e.target.value)}
                                        placeholder="Ders kitabı metnini buraya yapıştırın. Yapay zeka bu metni temel alır..."
                                        className="min-h-[160px] max-h-[320px] text-xs bg-slate-950 border-white/10 text-white focus:border-indigo-500 rounded-xl leading-relaxed font-sans resize-y"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-2">💡 AI tüm içerikleri bu metinden üretir.</p>
                                </div>
                            </Card>

                            <Card className="bg-gradient-to-b from-indigo-950/70 to-purple-950/50 border border-indigo-500/25 shadow-lg rounded-2xl overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
                                    <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                                    <span className="text-xs font-black text-white">AI Asistanı ile Slayt Üret</span>
                                </div>
                                <div className="p-3 space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            value={quickPromptText}
                                            onChange={(e) => setQuickPromptText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleQuickPromptGenerate();
                                                }
                                            }}
                                            placeholder="Slayt isteğinizi yazın..."
                                            className="bg-slate-950/90 border-white/15 text-[11px] text-white placeholder:text-slate-500 h-9 rounded-xl flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleQuickPromptGenerate}
                                            disabled={isQuickPromptGenerating || !quickPromptText.trim()}
                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black text-[10px] h-9 px-3 rounded-xl flex-shrink-0 cursor-pointer disabled:opacity-40"
                                        >
                                            {isQuickPromptGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* ══ DİYALOGLAR VE MODALLAR ══ */}
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
                
                <GameSelectorDialog
                    isOpen={isGameSelectorOpen}
                    onOpenChange={setIsGameSelectorOpen}
                    onGameSelected={handleGameSelected}
                    context={context}
                />

                <RegisteredAssetsDrawer
                    isOpen={isRegisteredAssetsOpen}
                    onOpenChange={setIsRegisteredAssetsOpen}
                    onAddSteps={handleAddSteps}
                    onAutoBuild10StepFlow={handleAutoBuild10StepFlow}
                    context={context}
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
                    topicTitle={title}
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
    
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [aiTargetIndex, setAiTargetIndex] = useState<number | undefined>(undefined);
    const [showHtmlEditor, setShowHtmlEditor] = useState(false);
    const [showHtmlPreview, setShowHtmlPreview] = useState(true);
    
    const addIdToSteps = (stepsList: LessonStep[]): DraggableLessonStep[] => {
        return stepsList.map((step, index) => ({ 
            ...step, 
            id: (step as any).id || `step-${Date.now()}-${index}-${Math.random()}` 
        }));
    };

    useEffect(() => {
        let isMounted = true;
        if (!courseId || !unitId || !topicId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const load = async () => {
            try {
                const topicRef = doc(db, 'courses', courseId, 'units', unitId, 'topics', topicId);
                const topicSnap = await getDoc(topicRef);
                if (isMounted) {
                    if (topicSnap.exists()) {
                        const topicData = { id: topicSnap.id, ...topicSnap.data() } as Topic;
                        setTitle(topicData.title || '');
                        setSteps(addIdToSteps(topicData.steps || []));
                        setSourceText(topicData.sourceText || '');
                        setHtmlContent(topicData.htmlContent || '');
                    } else {
                        toast({ title: "Hata", description: "Konu bulunamadı.", variant: "destructive" });
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    toast({ title: "Hata", description: "Konu yüklenirken sorun oluştu: " + err.message, variant: "destructive" });
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, [courseId, unitId, topicId]);

    const handleSaveFlow = async () => {
        if (!courseId || !unitId || !topicId) return;
        setIsSaving(true);
        const stepsToSave = steps.map(({ id, ...rest }) => rest);
        const result = await updateTopicContent({ courseId, unitId, topicId, steps: stepsToSave, sourceText, htmlContent });
        if (result.success) { 
            setCachedSteps(topicId, stepsToSave as any);
            toast({ title: "Başarılı", description: "Ders akışı başarıyla kaydedildi." });
        } else { 
            toast({ title: "Hata", description: result.error, variant: "destructive" }); 
        }
        setIsSaving(false);
    };
    
    const handleStepsGenerated = (newSteps: LessonStep[], targetIdx?: number) => {
        const newStepsWithIds = newSteps.map((step, index) => ({
            ...step,
            id: `step-${Date.now()}-${index}-${Math.random()}`
        }));
        setSteps(currentSteps => {
            if (targetIdx !== undefined && targetIdx >= 0 && targetIdx <= currentSteps.length) {
                const updated = [...currentSteps];
                updated.splice(targetIdx, 0, ...newStepsWithIds);
                return updated;
            }
            return [...currentSteps, ...newStepsWithIds];
        });
        toast({
            title: "Yapay Zeka İçeriği Eklendi! 🎉",
            description: `${newSteps.length} yeni adım eklendi. Kalıcı yapmak için 'Kaydet' butonuna basın.`
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
                onOpenAi={(idx) => {
                    setAiTargetIndex(idx);
                    setTimeout(() => setIsAIOpen(true), 10);
                }}
            >
                {/* ══ İNTERAKTİF HTML — Editör + Canlı Önizleme ══ */}
                <div className="border border-white/8 rounded-xl bg-slate-900/40 overflow-hidden">
                    {/* Başlık Çubuğu — tıklayınca açılır/kapanır */}
                    <button
                        type="button"
                        onClick={() => setShowHtmlEditor(v => !v)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors cursor-pointer bg-slate-900/60"
                    >
                        <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
                            <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-slate-300 flex-1 text-left">İnteraktif HTML İçeriği</span>
                        {htmlContent && (
                            <span className="text-[10px] text-rose-300 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                {htmlContent.length} karakter
                            </span>
                        )}
                        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-500 transition-transform", showHtmlEditor && "rotate-180")} />
                    </button>

                    {/* İçerik — sadece açıkken göster */}
                    {showHtmlEditor && (
                    <>
                        {/* Önizleme toggle alt çubuk */}
                        <div className="flex items-center gap-2 px-4 py-1.5 border-t border-white/8 bg-slate-950/40">
                            <span className="text-[10px] text-slate-500 flex-1">Editör + önizleme</span>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowHtmlPreview(v => !v); }}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer",
                                    showHtmlPreview
                                        ? "bg-indigo-600/30 border-indigo-500/50 text-indigo-300"
                                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                )}
                            >
                                <Eye className="h-3 w-3" />
                                {showHtmlPreview ? "Önizleme Açık" : "Önizlemeyi Aç"}
                            </button>
                        </div>

                        {/* Split Pane: Editör | Önizleme */}
                        <div className={cn("flex", showHtmlPreview ? "gap-0 divide-x divide-white/8" : "")}>
                        {/* Editör */}
                        <div className={cn("flex flex-col", showHtmlPreview ? "w-1/2" : "w-full")}>
                            <div className="px-2 py-1 bg-slate-950/60 border-b border-white/5">
                                <span className="text-[10px] font-mono text-slate-500">HTML Kodu</span>
                            </div>
                            <Textarea
                                value={htmlContent || ''}
                                onChange={(e) => setHtmlContent(e.target.value)}
                                placeholder="Konu detay sayfasında gösterilecek tam HTML kodunu buraya yapıştırın..."
                                className="min-h-[320px] h-[320px] font-mono text-xs bg-slate-950 border-0 border-none text-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none leading-relaxed resize-none"
                                style={{ resize: 'none' }}
                            />
                        </div>

                        {/* Canlı Önizleme */}
                        {showHtmlPreview && (
                            <div className="w-1/2 flex flex-col">
                                <div className="px-2 py-1 bg-slate-950/60 border-b border-white/5 flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-slate-500">Canlı Önizleme</span>
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                                {htmlContent ? (
                                    <iframe
                                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#0f172a;font-family:system-ui,sans-serif;color:#e2e8f0}*{box-sizing:border-box}</style></head><body>${htmlContent}</body></html>`}
                                        className="w-full h-[320px] bg-slate-950 border-0"
                                        sandbox="allow-scripts allow-same-origin"
                                        title="HTML Önizleme"
                                    />
                                ) : (
                                    <div className="flex-1 flex items-center justify-center h-[320px] text-slate-600 text-xs text-center p-4">
                                        <div>
                                            <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                            <p>HTML kodu yazıldıkça<br/>önizleme burada görünür</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                    </>
                )}
                </div>
            </TopicEditor>

            {isAIOpen && (
                <AiLessonStepGenerationDialog
                    isOpen={isAIOpen}
                    onOpenChange={setIsAIOpen}
                    topicTitle={title}
                    sourceText={sourceText}
                    targetIndex={aiTargetIndex}
                    onStepsGenerated={handleStepsGenerated}
                />
            )}
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