'use client';

import React, { useState, useEffect } from 'react';
import type { 
    LessonStep, HookQuestionStep, NotebookNoteStep, ProcessFlowStep, 
    ConceptMatrixStep, CategoryTableStep, CategoryTableColumn, McqStep, 
    TfStep, TrueFalseListStep, FitbStep, FlashcardStep, AnagramGameStep, 
    SentenceScrambleStep, VisualStep, VideoStep, HtmlSlideStep, IframeStep, AccordionStep 
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
    Sparkles, Loader2, Send, PlusCircle, Trash2, ChevronUp, 
    ChevronDown, CheckCircle2, XCircle, FileText, Wand2, Lightbulb,
    Eye, Layers, HelpCircle, BookOpen, Brain, Shuffle, Puzzle
} from 'lucide-react';
import { cn, cleanForAnagram } from '@/lib/utils';
import { refineLessonStep } from '@/ai/flows/refine-lesson-step';
import { useToast } from '@/hooks/use-toast';
import { getStepTypeMeta } from './slide-filmstrip';

export type SlideInspectorProps = {
    step: (LessonStep & { id: string }) | null;
    onUpdateStep: (updatedStep: LessonStep & { id: string }) => void;
    sourceText: string;
    setSourceText: (text: string) => void;
    htmlContent?: string;
    setHtmlContent?: (html: string) => void;
    topicTitle?: string;
    courseId?: string;
    unitId?: string;
    topicId?: string;
};

export function SlideInspector({
    step,
    onUpdateStep,
    sourceText,
    setSourceText,
    htmlContent,
    setHtmlContent,
    topicTitle,
    courseId,
    unitId,
    topicId,
}: SlideInspectorProps) {
    const { toast } = useToast();
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiRefining, setIsAiRefining] = useState(false);
    const [contentMode, setContentMode] = useState<'list' | 'raw'>('list');
    const [isHtmlPreviewOpen, setIsHtmlPreviewOpen] = useState(true);
    const [isSourceTextOpen, setIsSourceTextOpen] = useState(false);
    const [isTopicHtmlOpen, setIsTopicHtmlOpen] = useState(false);

    if (!step) {
        return (
            <div className="flex flex-col h-full bg-slate-950/80 rounded-3xl border border-white/10 p-6 items-center justify-center text-center text-slate-500">
                <Layers className="h-12 w-12 mx-auto mb-3 text-slate-600 opacity-40" />
                <h4 className="text-sm font-bold text-slate-300 mb-1">Slayt Seçilmedi</h4>
                <p className="text-xs text-slate-500">Düzenlemek için sol taraftaki şeritten bir slayta tıklayın.</p>
            </div>
        );
    }

    const meta = getStepTypeMeta(step.type);

    const handleFieldChange = (field: string, value: any) => {
        onUpdateStep({
            ...step,
            [field]: value,
        });
    };

    const handleArrayChange = (arrayField: string, index: number, subField: string | null, value: any) => {
        const currentArr = (step as any)[arrayField] ? [...(step as any)[arrayField]] : [];
        if (subField) {
            currentArr[index] = { ...currentArr[index], [subField]: value };
        } else {
            currentArr[index] = value;
        }
        onUpdateStep({
            ...step,
            [arrayField]: currentArr,
        });
    };

    const handleAddItemToArray = (arrayField: string, defaultItem: any) => {
        const currentArr = (step as any)[arrayField] ? [...(step as any)[arrayField]] : [];
        onUpdateStep({
            ...step,
            [arrayField]: [...currentArr, defaultItem],
        });
    };

    const handleRemoveItemFromArray = (arrayField: string, indexToRemove: number) => {
        const currentArr = (step as any)[arrayField] ? [...(step as any)[arrayField]] : [];
        onUpdateStep({
            ...step,
            [arrayField]: currentArr.filter((_: any, idx: number) => idx !== indexToRemove),
        });
    };

    const handleAiRefine = async (instructionToUse?: string) => {
        const finalInstruction = (instructionToUse || aiPrompt).trim();
        if (!finalInstruction || !step) return;

        setIsAiRefining(true);
        try {
            const activeKey = (typeof window !== 'undefined' ? localStorage.getItem('custom_gemini_api_key') : '') || undefined;
            const activeModel = (typeof window !== 'undefined' ? localStorage.getItem('custom_gemini_model') : '') || 'gemini-3.6-flash';

            const result = await refineLessonStep({
                currentStep: step,
                instruction: finalInstruction,
                topicTitle: topicTitle,
                sourceText: sourceText,
                apiKey: activeKey,
                modelName: activeModel,
            });

            if (result.updatedStep) {
                onUpdateStep({
                    ...result.updatedStep,
                    id: step.id,
                });
                setAiPrompt('');
                toast({
                    title: "✨ Slayt Yapay Zekâ ile Güncellendi",
                    description: result.explanation,
                });
            }
        } catch (err: any) {
            toast({
                title: "Düzenleme Hatası",
                description: err.message || "Slayt düzenlenirken bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsAiRefining(false);
        }
    };

    const parseSentences = (html: string): string[] => {
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

    const updateSentences = (sentences: string[]) => {
        const html = `<ul>${sentences.map(s => `<li>${s.replace(/^<li>|<\/li>$/g, '')}</li>`).join('')}</ul>`;
        handleFieldChange('content', html);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950/80 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Inspector Header */}
            <div className="p-3.5 border-b border-white/8 bg-slate-900/60 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-0.5 rounded-lg border", meta.color)}>
                        {meta.icon}
                        <span>{meta.label}</span>
                    </span>
                    <span className="text-xs font-black text-white">Slayt Özellikleri</span>
                </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Slayt Başlığı */}
                <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        Slayt Başlığı
                    </Label>
                    <Input
                        value={step.title || ''}
                        onChange={(e) => handleFieldChange('title', e.target.value)}
                        placeholder="Slayt başlığı girin..."
                        className="bg-slate-950 border-white/15 text-white font-bold text-sm h-10 rounded-xl focus:border-indigo-500"
                    />
                </div>

                {/* ══ AI İLE BU SLAYTI DÜZENLE KUTUSU ══ */}
                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 border border-indigo-500/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-indigo-300">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                        <span>AI ile Bu Slaytı Geliştir</span>
                    </div>

                    <div className="flex gap-1.5">
                        <Input
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAiRefine();
                                }
                            }}
                            placeholder="Örn: Konuyla ilgili Arapça ayet ve mealini ekle..."
                            className="bg-slate-950/90 border-white/15 text-xs text-white placeholder:text-slate-500 h-8 rounded-xl flex-1"
                        />
                        <Button
                            size="sm"
                            type="button"
                            onClick={() => handleAiRefine()}
                            disabled={isAiRefining || !aiPrompt.trim()}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer disabled:opacity-40"
                        >
                            {isAiRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        </Button>
                    </div>

                    {/* Hızlı AI Komut Çipleri */}
                    <div className="flex flex-wrap gap-1 pt-1">
                        {[
                            "Konuyla ilgili Arapça ayet ve Türkçe mealini ekle",
                            "Daha akıcı ve sade bir üslupla yeniden yaz",
                            "Deftere yazılacak maddeler halinde özetle",
                            "Seçenekleri ve çeldiricileri daha kaliteli yap",
                        ].map((chip, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleAiRefine(chip)}
                                className="text-[10px] px-2 py-1 rounded-lg bg-slate-950/80 hover:bg-indigo-950 border border-white/10 hover:border-indigo-400 text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
                            >
                                ✨ {chip}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══ SLAYT TÜRÜNE ÖZEL ALANLAR ══ */}
                <div className="pt-2">
                    {/* 1. hookQuestion */}
                    {step.type === 'hookQuestion' && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-amber-400 font-bold">🏷️ Üst Rozet / Etiket</Label>
                                <Input
                                    value={(step as HookQuestionStep).tag || ''}
                                    onChange={e => handleFieldChange('tag', e.target.value)}
                                    placeholder="Örn: 🤔 Derse Başlarken: Bir Düşünelim!"
                                    className="bg-slate-950 border-white/10 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-300 font-bold">❓ Giriş & Merak Sorusu Metni</Label>
                                <Textarea
                                    value={(step as HookQuestionStep).question || ''}
                                    onChange={e => handleFieldChange('question', e.target.value)}
                                    placeholder="Dikkat çekici soru metnini yazın..."
                                    className="bg-slate-950 border-white/10 min-h-[90px] text-xs font-semibold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-amber-300 font-bold">💡 Tartışma & Düşünme İpucu</Label>
                                <Textarea
                                    value={(step as HookQuestionStep).thoughtStarter || ''}
                                    onChange={e => handleFieldChange('thoughtStarter', e.target.value)}
                                    placeholder="Öğrencilerin tartışması için ipucu..."
                                    className="bg-slate-950 border-white/10 min-h-[70px] text-xs"
                                />
                            </div>
                        </div>
                    )}

                    {/* 2. notebookNote */}
                    {step.type === 'notebookNote' && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-emerald-400 font-bold">✏️ Defter Başlığı</Label>
                                <Input
                                    value={(step as NotebookNoteStep).noteTitle || ''}
                                    onChange={e => handleFieldChange('noteTitle', e.target.value)}
                                    placeholder="Örn: Dersin En Önemli Özet Maddeleri"
                                    className="bg-slate-950 border-white/10 text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-300 font-bold">Deftere Yazılacak Maddeler</Label>
                                    <Button
                                        size="sm"
                                        type="button"
                                        onClick={() => handleAddItemToArray('notes', `${((step as NotebookNoteStep).notes || []).length + 1}. Yeni kural...`)}
                                        className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-2"
                                    >
                                        + Madde Ekle
                                    </Button>
                                </div>
                                {((step as NotebookNoteStep).notes || []).map((note, nIdx) => (
                                    <div key={nIdx} className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono text-emerald-400 w-4">{nIdx + 1}.</span>
                                        <Input
                                            value={note}
                                            onChange={e => handleArrayChange('notes', nIdx, null, e.target.value)}
                                            className="bg-slate-950 border-white/10 text-xs flex-1 h-8"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItemFromArray('notes', nIdx)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. categoryTable */}
                    {step.type === 'categoryTable' && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-teal-400 font-bold">Tablo Başlığı</Label>
                                <Input
                                    value={(step as CategoryTableStep).tableTitle || ''}
                                    onChange={e => handleFieldChange('tableTitle', e.target.value)}
                                    className="bg-slate-950 border-white/10 text-xs font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-slate-300 font-bold">Kategoriler / Sütunlar</Label>
                                    <Button
                                        size="sm"
                                        type="button"
                                        onClick={() => handleAddItemToArray('categories', { name: 'Yeni Kategori', badge: 'Önemli', color: 'indigo', items: ['Madde 1', 'Madde 2'] })}
                                        className="h-6 text-[10px] bg-teal-600 hover:bg-teal-500 text-white rounded-lg px-2"
                                    >
                                        + Kategori Ekle
                                    </Button>
                                </div>
                                {((step as CategoryTableStep).categories || []).map((cat, cIdx) => (
                                    <div key={cIdx} className="p-2.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <Input
                                                value={cat.name}
                                                onChange={e => handleArrayChange('categories', cIdx, 'name', e.target.value)}
                                                placeholder="Kategori Adı"
                                                className="bg-slate-950 border-white/10 text-xs font-bold h-7 flex-1"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveItemFromArray('categories', cIdx)}
                                                className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={(cat.items || []).join('\n')}
                                            onChange={e => handleArrayChange('categories', cIdx, 'items', e.target.value.split('\n').filter(Boolean))}
                                            placeholder="Her satıra bir madde yazın..."
                                            className="bg-slate-950 border-white/10 text-xs min-h-[60px]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 4. processFlow */}
                    {step.type === 'processFlow' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-blue-400 font-bold">Aşama & Yol Haritası</Label>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => {
                                        const currentSteps = (step as ProcessFlowStep).steps || [];
                                        handleAddItemToArray('steps', { stepNumber: currentSteps.length + 1, title: `${currentSteps.length + 1}. Aşama`, description: 'Açıklama...' });
                                    }}
                                    className="h-6 text-[10px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-2"
                                >
                                    + Aşama Ekle
                                </Button>
                            </div>
                            {((step as ProcessFlowStep).steps || []).map((st, sIdx) => (
                                <div key={sIdx} className="p-2.5 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-black text-blue-400 font-mono">#{sIdx + 1}</span>
                                        <Input
                                            value={st.title}
                                            onChange={e => handleArrayChange('steps', sIdx, 'title', e.target.value)}
                                            placeholder="Aşama Başlığı"
                                            className="bg-slate-950 border-white/10 text-xs font-bold h-7 flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItemFromArray('steps', sIdx)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={st.description}
                                        onChange={e => handleArrayChange('steps', sIdx, 'description', e.target.value)}
                                        placeholder="Aşama açıklaması..."
                                        className="bg-slate-950 border-white/10 text-xs min-h-[50px]"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 5. mcq (Çoktan Seçmeli) */}
                    {step.type === 'mcq' && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-violet-400 font-bold">Soru Metni</Label>
                                <Textarea
                                    value={(step as McqStep).question || ''}
                                    onChange={e => handleFieldChange('question', e.target.value)}
                                    placeholder="Soru metnini yazın..."
                                    className="bg-slate-950 border-white/10 text-xs min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-300 font-bold">Seçenekler (Doğru olanı işaretleyin)</Label>
                                {((step as McqStep).options || []).map((opt, oIdx) => {
                                    const letter = String.fromCharCode(65 + oIdx);
                                    const isCorrect = (step as McqStep).correctAnswer === opt;
                                    return (
                                        <div key={oIdx} className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleFieldChange('correctAnswer', opt)}
                                                className={cn(
                                                    "w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center border transition-all cursor-pointer",
                                                    isCorrect ? "bg-emerald-500 text-white border-emerald-400" : "bg-slate-900 text-slate-400 border-white/10"
                                                )}
                                                title="Doğru Cevap Olarak İşaretle"
                                            >
                                                {letter}
                                            </button>
                                            <Input
                                                value={opt}
                                                onChange={e => {
                                                    const newOpts = [...(step as McqStep).options];
                                                    const oldVal = newOpts[oIdx];
                                                    newOpts[oIdx] = e.target.value;
                                                    handleFieldChange('options', newOpts);
                                                    if ((step as McqStep).correctAnswer === oldVal) {
                                                        handleFieldChange('correctAnswer', e.target.value);
                                                    }
                                                }}
                                                className="bg-slate-950 border-white/10 text-xs h-8 flex-1"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 6. tf (Doğru / Yanlış) */}
                    {step.type === 'tf' && (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-rose-400 font-bold">İfade Metni</Label>
                                <Textarea
                                    value={(step as TfStep).statement || ''}
                                    onChange={e => handleFieldChange('statement', e.target.value)}
                                    placeholder="Doğru/Yanlış ifadesini yazın..."
                                    className="bg-slate-950 border-white/10 text-xs min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-300 font-bold">Doğru Cevap</Label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleFieldChange('isTrue', true)}
                                        className={cn(
                                            "flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                            (step as TfStep).isTrue ? "bg-emerald-600 text-white border-emerald-400" : "bg-slate-900 text-slate-400 border-white/10"
                                        )}
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Doğru
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFieldChange('isTrue', false)}
                                        className={cn(
                                            "flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                                            !(step as TfStep).isTrue ? "bg-rose-600 text-white border-rose-400" : "bg-slate-900 text-slate-400 border-white/10"
                                        )}
                                    >
                                        <XCircle className="w-4 h-4" /> Yanlış
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 7. content (Metin / Cümleler) */}
                    {step.type === 'content' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-sky-400 font-bold">Metin & Cümleler</Label>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setContentMode(m => m === 'list' ? 'raw' : 'list')}
                                    className="h-6 text-[10px] border-white/10 bg-slate-950 text-slate-300"
                                >
                                    {contentMode === 'list' ? '📝 Kod / HTML' : '✨ Cümle Listesi'}
                                </Button>
                            </div>

                            {contentMode === 'list' ? (
                                <div className="space-y-2">
                                    {parseSentences((step as any).content || '').map((sent, sIdx, arr) => (
                                        <div key={sIdx} className="flex items-start gap-1.5">
                                            <span className="text-[10px] font-mono text-sky-400 w-4 pt-2">{sIdx + 1}.</span>
                                            <Textarea
                                                value={sent}
                                                onChange={e => {
                                                    const updated = [...arr];
                                                    updated[sIdx] = e.target.value;
                                                    updateSentences(updated);
                                                }}
                                                className="bg-slate-950 border-white/10 text-xs min-h-[50px] flex-1"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => updateSentences(arr.filter((_, idx) => idx !== sIdx))}
                                                className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0 mt-1"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        size="sm"
                                        type="button"
                                        onClick={() => updateSentences([...parseSentences((step as any).content || ''), 'Yeni açıklama cümlesi...'])}
                                        className="w-full h-8 text-xs bg-slate-900 border border-dashed border-sky-500/30 text-sky-300 hover:bg-sky-950"
                                    >
                                        + Yeni Cümle Ekle
                                    </Button>
                                </div>
                            ) : (
                                <Textarea
                                    value={(step as any).content || ''}
                                    onChange={e => handleFieldChange('content', e.target.value)}
                                    placeholder="HTML etiketli metin..."
                                    className="bg-slate-950 border-white/10 text-xs font-mono min-h-[160px]"
                                />
                            )}
                        </div>
                    )}

                    {/* 8. htmlSlide */}
                    {step.type === 'htmlSlide' && (
                        <div className="space-y-2">
                            <Label className="text-xs text-sky-400 font-bold">İnteraktif HTML Kodu</Label>
                            <Textarea
                                value={(step as HtmlSlideStep).htmlContent || ''}
                                onChange={e => handleFieldChange('htmlContent', e.target.value)}
                                placeholder="HTML & CSS kodunu buraya yapıştırın..."
                                className="bg-slate-950 border-white/10 font-mono text-xs min-h-[220px]"
                            />
                        </div>
                    )}

                    {/* 9. flashcard */}
                    {step.type === 'flashcard' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-emerald-400 font-bold">Bilgi Kartları</Label>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleAddItemToArray('cards', { term: 'Yeni Terim', definition: 'Yeni Tanım' })}
                                    className="h-6 text-[10px] bg-emerald-600 text-white rounded-lg px-2"
                                >
                                    + Kart Ekle
                                </Button>
                            </div>
                            {((step as FlashcardStep).cards || []).map((card, cIdx) => (
                                <div key={cIdx} className="p-2 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            value={card.term}
                                            onChange={e => handleArrayChange('cards', cIdx, 'term', e.target.value)}
                                            placeholder="Ön Yüz (Terim)"
                                            className="bg-slate-950 border-white/10 text-xs font-bold h-7 flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItemFromArray('cards', cIdx)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={card.definition}
                                        onChange={e => handleArrayChange('cards', cIdx, 'definition', e.target.value)}
                                        placeholder="Arka Yüz (Tanım / Açıklama)"
                                        className="bg-slate-950 border-white/10 text-xs min-h-[45px]"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 10. conceptExplanation */}
                    {step.type === 'conceptExplanation' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-indigo-400 font-bold">Kavram Açıklamaları</Label>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleAddItemToArray('items', { concept: 'Yeni Kavram', definition: 'Kavramın açıklaması...' })}
                                    className="h-6 text-[10px] bg-indigo-600 text-white rounded-lg px-2"
                                >
                                    + Kavram Ekle
                                </Button>
                            </div>
                            {((step as any).items || []).map((item: any, iIdx: number) => (
                                <div key={iIdx} className="p-2.5 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            value={item.concept}
                                            onChange={e => handleArrayChange('items', iIdx, 'concept', e.target.value)}
                                            placeholder="Kavram Adı"
                                            className="bg-slate-950 border-white/10 text-xs font-bold h-7 flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItemFromArray('items', iIdx)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={item.definition}
                                        onChange={e => handleArrayChange('items', iIdx, 'definition', e.target.value)}
                                        placeholder="Tanım / Açıklama"
                                        className="bg-slate-950 border-white/10 text-xs min-h-[45px]"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 11. conceptMatrix (4 Boyut) */}
                    {step.type === 'conceptMatrix' && (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-purple-400 font-bold">Konu Başlığı</Label>
                                <Input
                                    value={(step as any).topicName || ''}
                                    onChange={e => handleFieldChange('topicName', e.target.value)}
                                    placeholder="Analiz edilen konu adı..."
                                    className="bg-slate-950 border-white/10 text-xs h-8"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-300 font-bold">4 Kadran</Label>
                                {((step as any).quadrants || []).map((q: any, qIdx: number) => (
                                    <div key={qIdx} className="p-2 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                                        <Input
                                            value={q.label}
                                            onChange={e => handleArrayChange('quadrants', qIdx, 'label', e.target.value)}
                                            placeholder="Kadran Başlığı (Örn: 1. Nedir?)"
                                            className="bg-slate-950 border-white/10 text-xs font-bold h-7"
                                        />
                                        <Textarea
                                            value={q.content}
                                            onChange={e => handleArrayChange('quadrants', qIdx, 'content', e.target.value)}
                                            placeholder="Kadran içeriği..."
                                            className="bg-slate-950 border-white/10 text-xs min-h-[45px]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 12. matching (Kavram - Tanım Eşleştirme) */}
                    {(step.type === 'matching' || (step as any).type === 'conceptMatching') && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-amber-400 font-bold">Eşleştirme Çiftleri</Label>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleAddItemToArray('pairs', { concept: 'Kavram', definition: 'Tanım' })}
                                    className="h-6 text-[10px] bg-amber-600 text-white rounded-lg px-2"
                                >
                                    + Çift Ekle
                                </Button>
                            </div>
                            {((step as any).pairs || []).map((p: any, pIdx: number) => (
                                <div key={pIdx} className="p-2 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            value={p.concept}
                                            onChange={e => handleArrayChange('pairs', pIdx, 'concept', e.target.value)}
                                            placeholder="Kavram / Sol Taraf"
                                            className="bg-slate-950 border-white/10 text-xs font-bold h-7 flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItemFromArray('pairs', pIdx)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={p.definition}
                                        onChange={e => handleArrayChange('pairs', pIdx, 'definition', e.target.value)}
                                        placeholder="Tanım / Sağ Taraf"
                                        className="bg-slate-950 border-white/10 text-xs min-h-[40px]"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 13. trueFalseList */}
                    {step.type === 'trueFalseList' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-purple-400 font-bold">Doğru / Yanlış İfadeleri</Label>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleAddItemToArray('questions', { statement: 'Yeni ifade metni...', isTrue: true })}
                                    className="h-6 text-[10px] bg-purple-600 text-white rounded-lg px-2"
                                >
                                    + İfade Ekle
                                </Button>
                            </div>
                            {((step as any).questions || []).map((q: any, qIdx: number) => (
                                <div key={qIdx} className="p-2.5 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                                    <div className="flex items-start gap-1.5">
                                        <span className="text-[10px] font-mono text-purple-400 pt-1">{qIdx + 1}.</span>
                                        <Textarea
                                            value={q.statement}
                                            onChange={e => handleArrayChange('questions', qIdx, 'statement', e.target.value)}
                                            placeholder="İfade metni..."
                                            className="bg-slate-950 border-white/10 text-xs min-h-[45px] flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItemFromArray('questions', qIdx)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleArrayChange('questions', qIdx, 'isTrue', true)}
                                            className={cn(
                                                "flex-1 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1",
                                                q.isTrue ? "bg-emerald-600 text-white border-emerald-400" : "bg-slate-950 text-slate-500 border-white/10"
                                            )}
                                        >
                                            <CheckCircle2 className="w-3 h-3" /> Doğru
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleArrayChange('questions', qIdx, 'isTrue', false)}
                                            className={cn(
                                                "flex-1 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1",
                                                !q.isTrue ? "bg-rose-600 text-white border-rose-400" : "bg-slate-950 text-slate-500 border-white/10"
                                            )}
                                        >
                                            <XCircle className="w-3 h-3" /> Yanlış
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 14. fitb (Boşluk Doldurma) */}
                    {step.type === 'fitb' && (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-amber-400 font-bold">Cümle (Boşluğu _____ ile belirtin)</Label>
                                <Textarea
                                    value={(step as any).sentenceWithBlank || ''}
                                    onChange={e => handleFieldChange('sentenceWithBlank', e.target.value)}
                                    placeholder="Namazın şartlarından biri _____ abdest almaktır."
                                    className="bg-slate-950 border-white/10 text-xs min-h-[60px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-300 font-bold">Seçenekler & Doğru Cevap</Label>
                                {((step as any).options || []).map((opt: string, oIdx: number) => {
                                    const isCorrect = (step as any).correctAnswer === opt;
                                    return (
                                        <div key={oIdx} className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleFieldChange('correctAnswer', opt)}
                                                className={cn(
                                                    "w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center border transition-all",
                                                    isCorrect ? "bg-emerald-500 text-white border-emerald-400" : "bg-slate-900 text-slate-400 border-white/10"
                                                )}
                                            >
                                                {String.fromCharCode(65 + oIdx)}
                                            </button>
                                            <Input
                                                value={opt}
                                                onChange={e => {
                                                    const newOpts = [...(step as any).options];
                                                    const oldVal = newOpts[oIdx];
                                                    newOpts[oIdx] = e.target.value;
                                                    handleFieldChange('options', newOpts);
                                                    if ((step as any).correctAnswer === oldVal) {
                                                        handleFieldChange('correctAnswer', e.target.value);
                                                    }
                                                }}
                                                className="bg-slate-950 border-white/10 text-xs h-8 flex-1"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 15. visual (Görsel) */}
                    {step.type === 'visual' && (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-teal-400 font-bold">Görsel URL Adresi</Label>
                                <Input
                                    value={(step as any).imageUrl || ''}
                                    onChange={e => handleFieldChange('imageUrl', e.target.value)}
                                    placeholder="https://..."
                                    className="bg-slate-950 border-white/10 text-xs h-8"
                                />
                            </div>
                            {(step as any).imageUrl && (
                                <div className="rounded-xl overflow-hidden border border-white/10 max-h-48 bg-slate-950 flex items-center justify-center">
                                    <img src={(step as any).imageUrl} alt="Önizleme" className="max-h-48 object-contain" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* 16. video (Video) */}
                    {step.type === 'video' && (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-red-400 font-bold">Video URL (YouTube Embed / MP4)</Label>
                                <Input
                                    value={(step as any).url || ''}
                                    onChange={e => handleFieldChange('url', e.target.value)}
                                    placeholder="https://www.youtube.com/embed/..."
                                    className="bg-slate-950 border-white/10 text-xs h-8"
                                />
                            </div>
                            <p className="text-[10px] text-slate-500">💡 YouTube için embed URL kullanınız (Örn: https://www.youtube.com/embed/VIDEO_ID)</p>
                        </div>
                    )}

                    {/* 17. iframe (Simülasyon) */}
                    {step.type === 'iframe' && (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-indigo-400 font-bold">Simülasyon / Web Sayfası URL</Label>
                                <Input
                                    value={(step as any).url || ''}
                                    onChange={e => handleFieldChange('url', e.target.value)}
                                    placeholder="https://phet.colorado.edu/..."
                                    className="bg-slate-950 border-white/10 text-xs h-8"
                                />
                            </div>
                        </div>
                    )}

                    {/* 18. objectiveList (Öğrenme Hedefleri) */}
                    {step.type === 'objectiveList' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-yellow-400 font-bold">Öğrenme Hedefleri (Kazanımlar)</Label>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleAddItemToArray('items', 'Yeni öğrenme hedefi...')}
                                    className="h-6 text-[10px] bg-yellow-600 text-white rounded-lg px-2"
                                >
                                    + Hedef Ekle
                                </Button>
                            </div>
                            {((step as any).items || []).map((item: string, iIdx: number) => (
                                <div key={iIdx} className="flex items-center gap-1.5">
                                    <Input
                                        value={item}
                                        onChange={e => handleArrayChange('items', iIdx, null, e.target.value)}
                                        className="bg-slate-950 border-white/10 text-xs h-8 flex-1"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveItemFromArray('items', iIdx)}
                                        className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 19. accordion (Akordiyon) */}
                    {step.type === 'accordion' && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-emerald-400 font-bold">Akordiyon Bölümleri</Label>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleAddItemToArray('items', { id: `item-${Date.now()}`, title: 'Yeni Başlık', content: 'Bölüm içeriği...' })}
                                    className="h-6 text-[10px] bg-emerald-600 text-white rounded-lg px-2"
                                >
                                    + Bölüm Ekle
                                </Button>
                            </div>
                            {((step as any).items || []).map((item: any, iIdx: number) => (
                                <div key={iIdx} className="p-2 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            value={item.title}
                                            onChange={e => handleArrayChange('items', iIdx, 'title', e.target.value)}
                                            placeholder="Bölüm Başlığı"
                                            className="bg-slate-950 border-white/10 text-xs font-bold h-7 flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItemFromArray('items', iIdx)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={item.content}
                                        onChange={e => handleArrayChange('items', iIdx, 'content', e.target.value)}
                                        placeholder="Bölüm içeriği..."
                                        className="bg-slate-950 border-white/10 text-xs min-h-[45px]"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 20. sentenceScramble */}
                    {step.type === 'sentenceScramble' && (
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-cyan-400 font-bold">Karışık Cümle (Kelimeler arası boşluk bırakın)</Label>
                                <Input
                                    value={(step as any).scrambledSentence || ''}
                                    onChange={e => handleFieldChange('scrambledSentence', e.target.value)}
                                    placeholder="namazdır dinin direği"
                                    className="bg-slate-950 border-white/10 text-xs h-8"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-emerald-400 font-bold">Doğru Sıralı Cümle</Label>
                                <Input
                                    value={(step as any).correctSentence || ''}
                                    onChange={e => handleFieldChange('correctSentence', e.target.value)}
                                    placeholder="namaz dinin direğidir"
                                    className="bg-slate-950 border-white/10 text-xs h-8"
                                />
                            </div>
                        </div>
                    )}

                    {/* 21. anagramGame & anagramFlashcard */}
                    {(step.type === 'anagramGame' || step.type === 'anagramFlashcard') && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-fuchsia-400 font-bold">Anagram Kelimeleri</Label>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleAddItemToArray('cards', { definition: 'İpucu', scrambledWord: 'AKARNA', correctAnswer: 'ANKARA' })}
                                    className="h-6 text-[10px] bg-fuchsia-600 text-white rounded-lg px-2"
                                >
                                    + Kelime Ekle
                                </Button>
                            </div>
                            {((step as any).cards || []).map((card: any, cIdx: number) => (
                                <div key={cIdx} className="p-2 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Input
                                            value={card.correctAnswer}
                                            onChange={e => {
                                                const val = e.target.value;
                                                handleArrayChange('cards', cIdx, 'correctAnswer', val);
                                                handleArrayChange('cards', cIdx, 'scrambledWord', cleanForAnagram(val));
                                            }}
                                            placeholder="Doğru Kelime"
                                            className="bg-slate-950 border-white/10 text-xs font-bold h-7 flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveItemFromArray('cards', cIdx)}
                                            className="h-7 w-7 text-slate-500 hover:text-rose-400 p-0"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Input
                                        value={card.definition}
                                        onChange={e => handleArrayChange('cards', cIdx, 'definition', e.target.value)}
                                        placeholder="Tanım / İpucu"
                                        className="bg-slate-950 border-white/10 text-xs h-7"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ══ ALT ÇEKMECELER: Kaynak Metin & İnteraktif HTML ══ */}
                <div className="pt-4 space-y-2 border-t border-white/10">
                    {/* Kaynak Metin Çekmecesi */}
                    <div className="border border-white/8 rounded-2xl bg-slate-900/40 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsSourceTextOpen(v => !v)}
                            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors cursor-pointer text-left"
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-xs font-bold text-white">Ders Kaynak Metni</span>
                            </div>
                            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isSourceTextOpen && "rotate-180")} />
                        </button>
                        {isSourceTextOpen && (
                            <div className="p-3 pt-0">
                                <Textarea
                                    value={sourceText}
                                    onChange={e => setSourceText(e.target.value)}
                                    placeholder="Ders kitabı metnini buraya yapıştırın..."
                                    className="bg-slate-950 border-white/10 text-xs min-h-[140px]"
                                />
                            </div>
                        )}
                    </div>

                    {/* İnteraktif HTML Çekmecesi */}
                    {setHtmlContent && (
                        <div className="border border-white/8 rounded-2xl bg-slate-900/40 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setIsTopicHtmlOpen(v => !v)}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors cursor-pointer text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                                    <span className="text-xs font-bold text-white">Konu İnteraktif HTML Kodu</span>
                                </div>
                                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isTopicHtmlOpen && "rotate-180")} />
                            </button>
                            {isTopicHtmlOpen && (
                                <div className="p-3 pt-0">
                                    <Textarea
                                        value={htmlContent || ''}
                                        onChange={e => setHtmlContent(e.target.value)}
                                        placeholder="Konu detay sayfasında gösterilecek tam HTML kodunu girin..."
                                        className="bg-slate-950 border-white/10 text-xs font-mono min-h-[140px]"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
