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
                <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-60 rounded-2xl shadow-2xl p-2 z-50">
                    <DropdownMenuItem 
                        onClick={() => onOpenAi?.(insertIndex)}
                        className="text-xs font-black text-yellow-300 focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-2 mb-1 bg-indigo-950/50 border border-indigo-500/30"
                    >
                        <Sparkles className="w-4 h-4 mr-2 text-yellow-400 animate-pulse" /> ✨ AI Stüdyosu ile Üret...
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10 my-1" />

                    <DropdownMenuLabel className="text-[11px] font-black uppercase text-indigo-400 tracking-wider px-2 py-1">
                        Anlatım Adımları
                    </DropdownMenuLabel>
                    {[
                        { label: '🤔 Giriş Sorusu (Dikkat Çekme)', type: 'hookQuestion' as LessonStep['type'], title: 'Derse Başlarken: Bir Düşünelim!' },
                        { label: '📊 Kategori & Sınıflandırma Tablosu', type: 'categoryTable' as LessonStep['type'], title: 'Konu Sınıflandırma Tablosu' },
                        { label: '🪜 Adım Adım Süreç & Yol Haritası', type: 'processFlow' as LessonStep['type'], title: 'Adım Adım Yol Haritası' },
                        { label: '✏️ Defterimize Yazalım', type: 'notebookNote' as LessonStep['type'], title: 'Defterimize Yazalım' },
                        { label: '💡 Kavram Açıklamaları', type: 'conceptExplanation' as LessonStep['type'], title: 'Kavram Açıklamaları' },
                        { label: '🔲 4 Boyut Konu Matrisi', type: 'conceptMatrix' as LessonStep['type'], title: '4 Boyutta Konu Analizi' },
                    ].map(opt => (
                        <DropdownMenuItem 
                            key={opt.label} 
                            onClick={() => onAddStep(opt.type!, opt.title!, insertIndex)}
                            className="text-xs font-semibold focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                        >
                            {opt.label}
                        </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="bg-white/10 my-1" />
                    
                    <DropdownMenuLabel className="text-[11px] font-black uppercase text-purple-400 tracking-wider px-2 py-1">
                        Değerlendirme Soruları
                    </DropdownMenuLabel>
                    {[
                        { label: 'Çoktan Seçmeli Soru', type: 'mcq' as LessonStep['type'], title: 'Kontrol Sorusu' },
                        { label: 'Doğru / Yanlış Listesi', type: 'trueFalseList' as LessonStep['type'], title: 'Doğru/Yanlış Alıştırması' },
                        { label: 'Boşluk Doldurma', type: 'fitb' as LessonStep['type'], title: 'Boşluk Doldurma' },
                        { label: 'Kavram - Tanım Eşleştirme', type: 'matching' as LessonStep['type'], title: 'Kavram Eşleştirme' },
                    ].map(opt => (
                        <DropdownMenuItem 
                            key={opt.label} 
                            onClick={() => onAddStep(opt.type!, opt.title!, insertIndex)}
                            className="text-xs font-semibold focus:bg-purple-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                        >
                            {opt.label}
                        </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="bg-white/10 my-1" />

                    <DropdownMenuItem 
                        onClick={() => onOpenGameSelector?.(insertIndex)}
                        className="text-xs font-bold text-orange-300 focus:bg-orange-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-2"
                    >
                        <Gamepad2 className="w-4 h-4 mr-2 text-orange-400" /> 🎮 Oyun / Etkinlik Ekle...
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
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
                const term = act.content?.term || act.content?.text || (act as any).title || '';
                const cleanWord = cleanForAnagram(term);
                return {
                    definition: act.content?.definition || `Bu kelime: "${term}"`,
                    correctAnswer: cleanWord,
                    scrambledWord: cleanWord.replace(/\s/g, '').split('').sort(() => Math.random() - 0.5).join('').toLocaleUpperCase('tr-TR')
                };
            });
            generatedSteps = [{
                type: 'anagramGame',
                title: 'Kelime Dehası',
                cards
            }];
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
            <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
                
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
                        
                        {/* ⋯ Diğer Araçlar — overflow menü */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="border-white/15 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold text-xs">
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
                            className="bg-slate-800 text-white hover:bg-slate-700 border border-white/10 shadow-md rounded-xl text-xs font-bold"
                        >
                            <Eye className="mr-1.5 h-3.5 w-3.5 text-cyan-400" /> Önizle
                        </Button>

                        <Button 
                            onClick={() => onOpenAi?.()}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-purple-950/40 rounded-xl text-xs font-black cursor-pointer"
                        >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-yellow-300 animate-pulse" /> AI Stüdyosu
                        </Button>

                        <Button 
                            onClick={onSave} 
                            disabled={isSaving} 
                            className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-40 text-xs px-5"
                        >
                            {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                            Kaydet
                        </Button>
                    </div>
                </div>

                {/* ══ KAYNAK METİN AKORDİYONU ══ */}
                <Card className="bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden rounded-3xl">
                    <Accordion type="single" collapsible defaultValue="source-text" className="w-full">
                        <AccordionItem value="source-text" className="border-b-0">
                            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 transition-colors">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col items-start text-left">
                                            <span className="text-base font-black text-white">Kaynak Metin (Yapay Zeka & Özet Temeli)</span>
                                            <span className="text-xs text-slate-400 font-normal">Bu metin, yapay zekanın konuya özel içerik üretmesi için temel alınır.</span>
                                        </div>
                                    </div>
                                    {sourceText && (
                                        <div className="text-[11px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-3 py-1 rounded-full">
                                            {sourceText.length.toLocaleString('tr-TR')} karakter • {sourceText.trim().split(/\s+/).filter(Boolean).length} kelime
                                        </div>
                                    )}
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-2 bg-slate-950/40">
                                <Textarea 
                                    value={sourceText} 
                                    onChange={(e) => setSourceText(e.target.value)}
                                    placeholder="Ders kitabı metnini, kazanım açıklamalarını veya konu özetini buraya yapıştırın (Herhangi bir uzunluk sınırı yoktur)..."
                                    className="min-h-[220px] max-h-[500px] text-sm bg-slate-950 border-white/10 text-white focus:border-indigo-500 rounded-2xl leading-relaxed font-sans"
                                />
                                <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-slate-400">
                                    <span>💡 Metniniz tam olarak kaydedilir. Yapay zeka bu metnin tamamını analiz ederek soru ve slayt üretir.</span>
                                    <span className="font-mono text-indigo-400">
                                        {sourceText ? `${sourceText.length} karakter` : 'Metin boş'}
                                    </span>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>

                {children}
                
                {/* ══ HIZLI YAPAY ZEKA PROMPT İLE SLAYT EKLEME ÇUBUĞU ══ */}
                <Card className="p-3 sm:p-4 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-purple-950/80 border-2 border-indigo-500/30 shadow-xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                            </div>
                            <span className="text-xs font-black text-white whitespace-nowrap">
                                AI Asistanı:
                            </span>
                        </div>

                        <div className="flex-1 relative">
                            <Input
                                value={quickPromptText}
                                onChange={(e) => setQuickPromptText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleQuickPromptGenerate();
                                    }
                                }}
                                placeholder="Yapay zekâya söyleyin, slaytı anında üretsin (Örn: Haccın yapılışını adım adım gösteren infografik ve süreç akışı ekle)..."
                                className="bg-slate-950/90 border-white/15 text-xs sm:text-sm text-white placeholder:text-slate-500 h-10 rounded-xl pr-3"
                            />
                        </div>

                        <Button
                            type="button"
                            onClick={handleQuickPromptGenerate}
                            disabled={isQuickPromptGenerating || !quickPromptText.trim()}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs h-10 px-5 rounded-xl shadow-lg shadow-emerald-950/50 flex-shrink-0 cursor-pointer disabled:opacity-40"
                        >
                            {isQuickPromptGenerating ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Hazırlanıyor...</>
                            ) : (
                                <><Send className="w-3.5 h-3.5 mr-1.5" /> 🚀 Üret & Ekle</>
                            )}
                        </Button>
                    </div>

                    {/* Hızlı Örnek İstek Etiketleri */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                        <span className="text-slate-400 font-bold flex items-center gap-1 flex-shrink-0">
                            <Lightbulb className="w-3 h-3 text-amber-400" /> Hızlı İstekler:
                        </span>
                        {[
                            "Haccın yapılışını adım adım gösteren süreç akışı ve infografik hazırla",
                            "Namazın farzları ve vacipleri tablosu yap",
                            "Ahiret hayatının aşamalarını gösteren yol haritası ekle",
                            "Konuyla ilgili 4 adet çoktan seçmeli sınav sorusu üret",
                            "Deftere yazılacak en önemli 3 özet kuralı hazırla",
                        ].map((sample, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setQuickPromptText(sample)}
                                className="px-2.5 py-1 rounded-full bg-slate-950/80 hover:bg-indigo-950 border border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white font-medium whitespace-nowrap transition-colors cursor-pointer flex-shrink-0 text-[10px]"
                            >
                                ✨ {sample.slice(0, 32)}...
                            </button>
                        ))}
                    </div>
                </Card>

                {/* ══ DERS AKIŞI LİSTESİ & ADIM YÖNETİMİ ══ */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30 text-purple-400">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Sunum & Ders Akışı Adımları</h2>
                            <p className="text-xs text-slate-400">Sıralamayı sürükleyerek veya oklarla değiştirebilir, adımlar arasına yeni adım ekleyebilirsiniz.</p>
                        </div>
                    </div>

                    {/* Dnd-Kit Sortable Adım Listesi */}
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
                                {/* En başa adım ekleme çizgisi */}
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
                                                
                                                {/* Her adımın ardına araya ekleme çizgisi */}
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
                                            Yukarıdaki <strong>"⚡ 10 Adımlık Dersi Kur"</strong> butonuna basarak sistemdeki kayıtlı kavramlar, cümleler, oyun ve AI ile tam ders akışınızı 5 saniyede oluşturabilirsiniz.
                                        </p>
                                        <Button
                                            onClick={() => setIsRegisteredAssetsOpen(true)}
                                            className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-black text-xs px-6 py-2.5 rounded-2xl shadow-xl shadow-orange-950/50"
                                        >
                                            <Wand2 className="w-4 h-4 mr-2 text-yellow-200" /> ⚡ 10 Adımlık Dersi Otomatik Kur
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>

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