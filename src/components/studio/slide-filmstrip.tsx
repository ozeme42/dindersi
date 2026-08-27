'use client';

import React from 'react';
import type { LessonStep } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    HelpCircle, FileText, Layers, Brain, BookOpen, Shuffle, Puzzle, 
    Image as ImageIcon, Video, Gamepad2, Plus, Sparkles, Copy, Trash2,
    Eye, EyeOff, ChevronUp, ChevronDown, GripVertical, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

export function getStepTypeMeta(type?: LessonStep['type']) {
    switch (type) {
        case 'hookQuestion': return { label: 'Giriş Sorusu', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> };
        case 'notebookNote': return { label: 'Defter Notu', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', icon: <FileText className="w-3.5 h-3.5 text-emerald-400" /> };
        case 'processFlow': return { label: 'Süreç / Yol', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10', icon: <Layers className="w-3.5 h-3.5 text-blue-400" /> };
        case 'conceptMatrix': return { label: '4 Boyut Matris', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', icon: <Brain className="w-3.5 h-3.5 text-purple-400" /> };
        case 'categoryTable': return { label: 'Kategori Tablosu', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10', icon: <Layers className="w-3.5 h-3.5 text-teal-400" /> };
        case 'content': return { label: 'Metin', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10', icon: <FileText className="w-3.5 h-3.5 text-sky-400" /> };
        case 'objectiveList': return { label: 'Hedefler', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10', icon: <BookOpen className="w-3.5 h-3.5 text-yellow-400" /> };
        case 'conceptExplanation': return { label: 'Kavramlar', color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10', icon: <Brain className="w-3.5 h-3.5 text-indigo-400" /> };
        case 'flashcard': return { label: 'Bilgi Kartı', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10', icon: <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> };
        case 'trueFalseList': return { label: 'D/Y Listesi', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10', icon: <HelpCircle className="w-3.5 h-3.5 text-purple-400" /> };
        case 'mcq': return { label: 'Çoktan Seçmeli', color: 'text-violet-400 border-violet-500/30 bg-violet-500/10', icon: <HelpCircle className="w-3.5 h-3.5 text-violet-400" /> };
        case 'tf': return { label: 'Doğru/Yanlış', color: 'text-rose-400 border-rose-500/30 bg-rose-500/10', icon: <HelpCircle className="w-3.5 h-3.5 text-rose-400" /> };
        case 'fitb': return { label: 'Boşluk Doldurma', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', icon: <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> };
        case 'sentenceScramble': return { label: 'Cümle Düzeltme', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10', icon: <Shuffle className="w-3.5 h-3.5 text-cyan-400" /> };
        case 'anagramGame': 
        case 'anagramFlashcard': return { label: 'Anagram', color: 'text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/10', icon: <Puzzle className="w-3.5 h-3.5 text-fuchsia-400" /> };
        case 'visual': return { label: 'Görsel', color: 'text-teal-400 border-teal-500/30 bg-teal-500/10', icon: <ImageIcon className="w-3.5 h-3.5 text-teal-400" /> };
        case 'video': return { label: 'Video', color: 'text-red-400 border-red-500/30 bg-red-500/10', icon: <Video className="w-3.5 h-3.5 text-red-400" /> };
        case 'activityLink': return { label: 'Oyun', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10', icon: <Gamepad2 className="w-3.5 h-3.5 text-orange-400" /> };
        case 'htmlSlide': return { label: 'HTML Slayt', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10', icon: <FileText className="w-3.5 h-3.5 text-sky-400" /> };
        default: return { label: 'Adım', color: 'text-slate-400 border-slate-500/30 bg-slate-500/10', icon: <Layers className="w-3.5 h-3.5 text-slate-400" /> };
    }
}

function FilmstripSlideItem({
    step,
    index,
    isSelected,
    onSelect,
    onDuplicate,
    onDelete,
    onTogglePublish,
}: {
    step: LessonStep & { id: string };
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onTogglePublish: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
    const meta = getStepTypeMeta(step.type);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 50 : 1,
    };

    const isPublished = step.isPublished ?? true;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={cn(
                "group relative flex items-start gap-2.5 p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer select-none",
                isSelected
                    ? "bg-gradient-to-r from-indigo-950/90 to-purple-950/80 border-indigo-500 shadow-lg shadow-indigo-950/50 ring-2 ring-indigo-500/40"
                    : "bg-slate-900/60 hover:bg-slate-900 border-white/8 hover:border-white/20",
                !isPublished && "opacity-50"
            )}
        >
            {/* Slayt Numarası */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                <span className={cn(
                    "w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center border",
                    isSelected 
                        ? "bg-indigo-500 text-white border-indigo-400 shadow-md" 
                        : "bg-slate-950 text-slate-400 border-white/10 group-hover:text-white"
                )}>
                    {index + 1}
                </span>

                {/* Sürükleme Tutamacı */}
                <div
                    {...attributes}
                    {...listeners}
                    className="p-1 rounded text-slate-600 hover:text-slate-300 cursor-grab active:cursor-grabbing"
                    title="Sıralamak için sürükleyin"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </div>
            </div>

            {/* Thumbnail / Mini Bilgi Kartı */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border", meta.color)}>
                        {meta.icon}
                        <span className="truncate max-w-[100px]">{meta.label}</span>
                    </span>
                    {!isPublished && (
                        <span className="text-[9px] font-bold text-slate-500 flex items-center gap-0.5">
                            <EyeOff className="w-2.5 h-2.5" /> Gizli
                        </span>
                    )}
                </div>

                <p className={cn(
                    "text-xs font-bold truncate leading-tight",
                    isSelected ? "text-white" : "text-slate-300 group-hover:text-white"
                )}>
                    {step.title || 'Başlıksız Slayt'}
                </p>

                {/* Mini İçerik İpucu */}
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {step.type === 'hookQuestion' && (step as any).question}
                    {step.type === 'notebookNote' && `${((step as any).notes || []).length} not`}
                    {step.type === 'processFlow' && `${((step as any).steps || []).length} adım`}
                    {step.type === 'categoryTable' && `${((step as any).categories || []).length} kategori`}
                    {step.type === 'mcq' && (step as any).question}
                    {step.type === 'tf' && (step as any).statement}
                    {step.type === 'content' && typeof (step as any).content === 'string' && (step as any).content.replace(/<[^>]+>/g, '').slice(0, 35)}
                    {step.type === 'flashcard' && `${((step as any).cards || []).length} kart`}
                    {step.type === 'trueFalseList' && `${((step as any).questions || []).length} soru`}
                    {step.type === 'htmlSlide' && 'İnteraktif HTML'}
                    {step.type === 'activityLink' && ((step as any).activityLabel || 'Oyun')}
                </p>
            </div>

            {/* Hover Butonları */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDuplicate}
                    className="h-6 w-6 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg p-0"
                    title="Kopyala / Çoğalt"
                >
                    <Copy className="h-3 w-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onTogglePublish}
                    className={cn("h-6 w-6 rounded-lg p-0", isPublished ? "text-slate-400 hover:text-amber-400" : "text-amber-400 hover:text-white")}
                    title={isPublished ? "Slaytı Gizle" : "Slaytı Göster"}
                >
                    {isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onDelete}
                    className="h-6 w-6 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-0"
                    title="Slaytı Sil"
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

export type SlideFilmstripProps = {
    steps: (LessonStep & { id: string })[];
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
    onReorderSteps: (oldIndex: number, newIndex: number) => void;
    onAddStep: (type: LessonStep['type'], defaultTitle: string, atIndex?: number) => void;
    onDuplicateStep: (index: number) => void;
    onDeleteStep: (index: number) => void;
    onTogglePublishStep: (index: number) => void;
    onOpenAi?: (targetIndex?: number) => void;
    onOpenGameSelector?: (targetIndex?: number) => void;
    onOpenRegisteredAssets?: () => void;
    onOpenLibrary?: (filter: any[], multiSelect: boolean, stepType: any, atIndex?: number) => void;
};

export function SlideFilmstrip({
    steps,
    selectedIndex,
    onSelectIndex,
    onReorderSteps,
    onAddStep,
    onDuplicateStep,
    onDeleteStep,
    onTogglePublishStep,
    onOpenAi,
    onOpenGameSelector,
    onOpenRegisteredAssets,
    onOpenLibrary
}: SlideFilmstripProps) {
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = steps.findIndex((item) => item.id === active.id);
            const newIndex = steps.findIndex((item) => item.id === over.id);
            onReorderSteps(oldIndex, newIndex);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/80 rounded-3xl border border-white/10 overflow-hidden">
            {/* Filmstrip Header */}
            <div className="p-3.5 border-b border-white/8 bg-slate-900/60 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">
                        Slaytlar
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-slate-950 border-white/10 text-slate-300 px-1.5 py-0">
                        {steps.length}
                    </Badge>
                </div>

                {/* Slayt Ekle Butonu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            size="sm" 
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-7 px-2.5 rounded-xl shadow-md shadow-indigo-950/50 cursor-pointer"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Ekle
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-950 border border-white/15 text-white w-64 rounded-2xl shadow-2xl p-2 z-50">
                        <DropdownMenuItem 
                            onClick={() => onOpenAi?.(selectedIndex + 1)}
                            className="text-xs font-black text-yellow-300 focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-2 mb-1 bg-indigo-950/50 border border-indigo-500/30"
                        >
                            <Sparkles className="w-4 h-4 mr-2 text-yellow-400 animate-pulse" /> ✨ AI ile Slayt Üret...
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-indigo-400 tracking-wider px-2 py-1">Anlatım Slaytları</DropdownMenuLabel>
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
                                onClick={() => onAddStep(opt.type!, opt.title!, selectedIndex + 1)}
                                className="text-xs font-semibold focus:bg-indigo-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                            >
                                {opt.label}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-purple-400 tracking-wider px-2 py-1">Değerlendirme & Etkinlik</DropdownMenuLabel>
                        {[
                            { label: '🔘 Çoktan Seçmeli Soru', type: 'mcq' as LessonStep['type'], title: 'Kontrol Sorusu' },
                            { label: '✅/❌ Doğru / Yanlış Listesi', type: 'trueFalseList' as LessonStep['type'], title: 'Doğru/Yanlış Alıştırması' },
                            { label: '❓ Tekli Doğru / Yanlış', type: 'tf' as LessonStep['type'], title: 'Doğru/Yanlış' },
                            { label: '✏️ Boşluk Doldurma', type: 'fitb' as LessonStep['type'], title: 'Boşluk Doldurma' },
                            { label: '🔗 Kavram Eşleştirme (Boş)', type: 'matching' as LessonStep['type'], title: 'Kavram Eşleştirme' },
                            { label: '🎴 Bilgi Kartı (Flashcard)', type: 'flashcard' as LessonStep['type'], title: 'Bilgi Kartı' },
                            { label: '🔤 Kelime Dehası (Anagram)', type: 'anagramGame' as LessonStep['type'], title: 'Kelime Dehası' },
                            { label: '🔤 Anagram Bilgi Kartı', type: 'anagramFlashcard' as LessonStep['type'], title: 'Anagram Bilgi Kartı' },
                            { label: '🧩 Karışık Cümle Tamamlama', type: 'sentenceScramble' as LessonStep['type'], title: 'Cümle Sıralama' },
                        ].map(opt => (
                            <DropdownMenuItem 
                                key={opt.label} 
                                onClick={() => onAddStep(opt.type!, opt.title!, selectedIndex + 1)}
                                className="text-xs font-semibold focus:bg-purple-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                            >
                                {opt.label}
                            </DropdownMenuItem>
                        ))}
                        
                        {/* ══ VERİ BANKASINDAN İÇERİK SEÇME ══ */}
                        {onOpenLibrary && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10 my-1" />
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-amber-400 tracking-wider px-2 py-1">📚 Veri Bankasından Aktar</DropdownMenuLabel>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['definition'], true, 'matching', selectedIndex + 1)}
                                    className="text-xs font-bold text-amber-300 focus:bg-amber-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-2 text-amber-400" /> Veri Bankasından Tanım Eşleştirme
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['concept'], true, 'anagramFlashcard', selectedIndex + 1)}
                                    className="text-xs font-bold text-fuchsia-300 focus:bg-fuchsia-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <Puzzle className="w-3.5 h-3.5 mr-2 text-fuchsia-400" /> 🔤 Veri Bankasından Anagram Kartları (Dokun & Çevir)
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['concept'], true, 'anagramGame', selectedIndex + 1)}
                                    className="text-xs font-semibold text-purple-300 focus:bg-purple-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <Gamepad2 className="w-3.5 h-3.5 mr-2 text-purple-400" /> 🎮 Veri Bankasından Kelime Dehası (Oyun)
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['definition'], true, 'flashcard', selectedIndex + 1)}
                                    className="text-xs font-semibold text-emerald-300 focus:bg-emerald-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-2 text-emerald-400" /> Veri Bankasından Bilgi Kartları
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['concept'], true, 'conceptExplanation', selectedIndex + 1)}
                                    className="text-xs font-semibold text-cyan-300 focus:bg-cyan-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Veri Bankasından Kavram Kartları
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['sentence'], true, 'sentenceScramble', selectedIndex + 1)}
                                    className="text-xs font-semibold text-cyan-300 focus:bg-cyan-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <Shuffle className="w-3.5 h-3.5 mr-2 text-cyan-400" /> Veri Bankasından Cümle Sıralama
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['images'], true, 'visual', selectedIndex + 1)}
                                    className="text-xs font-semibold text-teal-300 focus:bg-teal-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <ImageIcon className="w-3.5 h-3.5 mr-2 text-teal-400" /> Arşivden Görsel Ekle...
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => onOpenLibrary(['questions'], true, 'questions', selectedIndex + 1)}
                                    className="text-xs font-semibold text-indigo-300 focus:bg-indigo-600/20 focus:text-white rounded-lg cursor-pointer px-2.5 py-1.5"
                                >
                                    <BookOpen className="w-3.5 h-3.5 mr-2 text-indigo-400" /> Soru Bankasından Soru Seç...
                                </DropdownMenuItem>
                            </>
                        )}

                        <DropdownMenuSeparator className="bg-white/10 my-1" />
                        <DropdownMenuItem 
                            onClick={() => onOpenGameSelector?.(selectedIndex + 1)}
                            className="text-xs font-bold text-orange-300 focus:bg-orange-600 focus:text-white rounded-lg cursor-pointer px-2.5 py-2"
                        >
                            <Gamepad2 className="w-4 h-4 mr-2 text-orange-400" /> 🎮 Oyun Ekle...
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Slayt Listesi */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={steps.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {steps.map((step, idx) => (
                            <FilmstripSlideItem
                                key={step.id}
                                step={step}
                                index={idx}
                                isSelected={idx === selectedIndex}
                                onSelect={() => onSelectIndex(idx)}
                                onDuplicate={() => onDuplicateStep(idx)}
                                onDelete={() => onDeleteStep(idx)}
                                onTogglePublish={() => onTogglePublishStep(idx)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {steps.length === 0 && (
                    <div className="text-center py-10 px-3 text-slate-500 text-xs">
                        <Wand2 className="w-8 h-8 mx-auto mb-2 text-amber-400 opacity-40 animate-pulse" />
                        <p className="font-bold text-slate-300 mb-1">Henüz slayt yok</p>
                        <p className="text-[11px] mb-3">Yukarıdaki "+ Ekle" butonuna veya AI Stüdyosu'na tıklayın.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
