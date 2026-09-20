'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    BookOpen, Search, Sparkles, Plus, Trash2, CheckCircle2,
    Tag, AlertTriangle, Wand2, Edit3, X, Zap, ArrowUpRight,
    Copy, Check, ZoomIn, ZoomOut, Eye, Info, RefreshCw, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
    Popover, PopoverTrigger, PopoverContent
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { normalizeConcept } from '@/lib/concept-utils';
import type { ConceptItem } from './actions';
import { cn } from '@/lib/utils';

// Helper: Capitalize in Turkish locale
export function toConceptTitleCase(str: string): string {
    if (!str) return '';
    const trimmed = str.trim();
    // Split by spaces or hyphens to capitalize parts (e.g. "sadaka-i cariye" -> "Sadaka-i Cariye")
    return trimmed.replace(/(^|[\s\-])([\p{L}])/gu, (_, boundary, char) => {
        return boundary + char.toLocaleUpperCase('tr');
    });
}

// Helper: Clean clicked word or selection for concept extraction
export function cleanWordForConcept(raw: string): string {
    if (!raw) return '';
    let cleaned = raw.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!cleaned) return '';

    // If it has apostrophe followed by a short suffix (e.g. Allah'ın, Mekke'de, Kur'an'da)
    const lastApo = Math.max(cleaned.lastIndexOf("'"), cleaned.lastIndexOf("’"));
    if (lastApo > 0) {
        const suffix = cleaned.slice(lastApo + 1);
        if (/^[\p{L}]{1,5}$/u.test(suffix)) {
            cleaned = cleaned.slice(0, lastApo);
        }
    }
    return toConceptTitleCase(cleaned);
}

function escapeRegex(s: string): string {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// Converts a concept to a Turkish-aware regex pattern
function conceptToRegex(concept: string): string {
    let flex = '';
    const trimmed = concept.trim();
    for (const char of trimmed) {
        const lower = char.toLocaleLowerCase('tr');
        if (lower === 'a' || lower === 'â') flex += '[aAâÂ]';
        else if (lower === 'e' || lower === 'ê') flex += '[eEêÊ]';
        else if (lower === 'i' || lower === 'î' || lower === 'ı') flex += '[iIıİîÎ]';
        else if (lower === 'u' || lower === 'û' || lower === 'ü') flex += '[uUüÜûÛ]';
        else if (lower === 'o' || lower === 'ö') flex += '[oOöÖ]';
        else if (lower === 'c' || lower === 'ç') flex += '[cÇcç]';
        else if (lower === 's' || lower === 'ş') flex += '[sSşŞ]';
        else if (lower === 'g' || lower === 'ğ') flex += '[gGğĞ]';
        else if (lower === ' ' || lower === '-') flex += '[-–—\\s]+';
        else if (char === '\'' || char === '’') flex += '[\'’]?';
        else flex += escapeRegex(char);
    }

    const isSingleWord = !/[\s-]/.test(trimmed);
    const suffixGroup = isSingleWord && trimmed.length >= 3
        ? '(?:[\'’][\\p{L}]+|(?:ler|lar|in|ın|un|ün|nin|nın|nun|nün|e|a|ye|ya|i|ı|u|ü|yi|yı|yu|yü|de|da|te|ta|den|dan|ten|tan|dir|dır|dur|dür|tir|tır|le|la)?)'
        : '(?:[\'’][\\p{L}]+)?';

    return '(?<=^|[^\\p{L}\\p{N}])(' + flex + suffixGroup + ')(?=[^\\p{L}\\p{N}]|$)';
}

interface ProcessedConcept {
    original: string;
    norm: string;
    hasDefinition: boolean;
    definition?: string;
    regex: RegExp;
}

export interface InteractiveSourceHighlighterProps {
    sourceText: string;
    concepts: string[];
    conceptDefinitions: ConceptItem[];
    topicTitle: string;
    onAddConcept: (concept: string) => void;
    onRemoveConcept?: (indexOrName: number | string) => void;
    onOpenDefinitionCard?: (conceptName: string) => void;
    onUpdateSourceText?: (newText: string) => void;
    onRequestAiConcepts?: () => void;
    onRequestAiMissingDefinitions?: () => void;
    missingDefinitionConcepts?: string[];
    className?: string;
}

export function InteractiveSourceHighlighter({
    sourceText,
    concepts,
    conceptDefinitions,
    topicTitle,
    onAddConcept,
    onRemoveConcept,
    onOpenDefinitionCard,
    onUpdateSourceText,
    onRequestAiConcepts,
    onRequestAiMissingDefinitions,
    missingDefinitionConcepts = [],
    className
}: InteractiveSourceHighlighterProps) {
    const { toast } = useToast();

    // UI States
    const [searchQuery, setSearchQuery] = useState('');
    const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1.05); // rem
    const [fastClickMode, setFastClickMode] = useState(true);
    const [isEditTextOpen, setIsEditTextOpen] = useState(false);
    const [editTextValue, setEditTextValue] = useState(sourceText || '');
    const [filterCompanionTab, setFilterCompanionTab] = useState<'all' | 'inText' | 'notInText' | 'undefined'>('all');
    const [companionSearch, setCompanionSearch] = useState('');
    const [newConceptManual, setNewConceptManual] = useState('');

    // Text selection state (for multi-word phrase additions)
    const [selectedTextSnippet, setSelectedTextSnippet] = useState<string | null>(null);

    // Active selected concept in text (for popover details)
    const [activePopoverConcept, setActivePopoverConcept] = useState<{
        original: string;
        hasDefinition: boolean;
        definition?: string;
        occurrences: number;
    } | null>(null);

    const textContainerRef = useRef<HTMLDivElement>(null);

    // Synchronize editTextValue when sourceText changes from parent
    useEffect(() => {
        setEditTextValue(sourceText || '');
    }, [sourceText]);

    // Build unique definitions map
    const definitionsMap = useMemo(() => {
        const map = new Map<string, ConceptItem>();
        conceptDefinitions.forEach(d => {
            const trimmed = (d.concept || '').trim();
            const norm = normalizeConcept(trimmed);
            if (trimmed && norm) {
                map.set(norm, d);
            }
        });
        return map;
    }, [conceptDefinitions]);

    // Build mapped concepts list with compiled regex patterns (longest first)
    const processedConcepts = useMemo(() => {
        const map = new Map<string, ProcessedConcept>();

        // 1. Defined concepts
        conceptDefinitions.forEach(d => {
            const trimmed = (d.concept || '').trim();
            const norm = normalizeConcept(trimmed);
            if (!trimmed || !norm) return;
            try {
                map.set(norm, {
                    original: trimmed,
                    norm,
                    hasDefinition: Boolean(d.definition && d.definition.trim()),
                    definition: d.definition,
                    regex: new RegExp(conceptToRegex(trimmed), 'giu')
                });
            } catch {}
        });

        // 2. Pool concepts
        concepts.forEach(c => {
            const trimmed = (c || '').trim();
            const norm = normalizeConcept(trimmed);
            if (!trimmed || !norm) return;
            if (!map.has(norm)) {
                try {
                    map.set(norm, {
                        original: trimmed,
                        norm,
                        hasDefinition: false,
                        regex: new RegExp(conceptToRegex(trimmed), 'giu')
                    });
                } catch {}
            }
        });

        const list = Array.from(map.values());
        // Sort: longest original string first to prioritize multi-word compound terms
        list.sort((a, b) => b.original.length - a.original.length);
        return list;
    }, [concepts, conceptDefinitions]);

    // Calculate occurrences for each concept in the source text
    const conceptOccurrences = useMemo(() => {
        const counts = new Map<string, number>();
        if (!sourceText) return counts;

        processedConcepts.forEach(c => {
            try {
                const regex = new RegExp(conceptToRegex(c.original), 'giu');
                const matches = sourceText.match(regex);
                counts.set(c.norm, matches ? matches.length : 0);
            } catch {
                counts.set(c.norm, 0);
            }
        });
        return counts;
    }, [sourceText, processedConcepts]);

    // Statistics
    const wordCount = useMemo(() => {
        if (!sourceText) return 0;
        return sourceText.trim().split(/\s+/).filter(Boolean).length;
    }, [sourceText]);

    const conceptsInTextCount = useMemo(() => {
        let count = 0;
        processedConcepts.forEach(c => {
            if ((conceptOccurrences.get(c.norm) || 0) > 0) {
                count++;
            }
        });
        return count;
    }, [processedConcepts, conceptOccurrences]);

    const conceptsNotInTextCount = useMemo(() => {
        return Math.max(0, processedConcepts.length - conceptsInTextCount);
    }, [processedConcepts.length, conceptsInTextCount]);

    // Fast Add Word Click Handler
    const handleWordClick = useCallback((wordToken: string) => {
        const clean = cleanWordForConcept(wordToken);
        if (!clean || clean.length < 2) return;

        const norm = normalizeConcept(clean);
        // Check if already in concepts
        const alreadyExists = processedConcepts.some(c => c.norm === norm);
        if (alreadyExists) {
            const existing = processedConcepts.find(c => c.norm === norm)!;
            setActivePopoverConcept({
                original: existing.original,
                hasDefinition: existing.hasDefinition,
                definition: existing.definition,
                occurrences: conceptOccurrences.get(existing.norm) || 1
            });
            return;
        }

        onAddConcept(clean);
        toast({
            title: "Kavram Eklendi! ✨",
            description: `"${clean}" kavram havuzuna eklendi ve metinde vurgulandı.`,
            variant: "default"
        });
    }, [processedConcepts, conceptOccurrences, onAddConcept, toast]);

    // Handle Text Selection (for multi-word phrase additions)
    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            return;
        }
        const text = selection.toString().trim();
        if (text && text.length >= 2 && !/[\n\r]/.test(text)) {
            const cleaned = cleanWordForConcept(text);
            if (cleaned && cleaned.length >= 2) {
                setSelectedTextSnippet(cleaned);
            }
        }
    }, []);

    const handleAddSelectedSnippet = () => {
        if (!selectedTextSnippet) return;
        onAddConcept(selectedTextSnippet);
        toast({
            title: "Seçilen Kavram Eklendi! ✨",
            description: `"${selectedTextSnippet}" havuza eklendi.`,
            variant: "default"
        });
        setSelectedTextSnippet(null);
        window.getSelection()?.removeAllRanges();
    };

    // Scroll to a concept in the text container
    const handleScrollToConcept = (conceptName: string) => {
        const norm = normalizeConcept(conceptName);
        if (!textContainerRef.current) return;
        const targetElement = textContainerRef.current.querySelector(`[data-concept-norm="${norm}"]`);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary animation pulse
            targetElement.classList.add('ring-4', 'ring-amber-400', 'scale-110');
            setTimeout(() => {
                targetElement.classList.remove('ring-4', 'ring-amber-400', 'scale-110');
            }, 1600);
        } else {
            toast({
                title: "Bulunamadı",
                description: `"${conceptName}" bu kaynak metinde birebir geçmiyor (harici kavram).`
            });
        }
    };

    // Split text into paragraphs
    const paragraphs = useMemo(() => {
        if (!sourceText) return [];
        return sourceText.split(/\n+/).map(p => p.trim()).filter(Boolean);
    }, [sourceText]);

    // Render a single paragraph with smart concept matching & clickable words
    const renderParagraph = (para: string, pIdx: number) => {
        if (!para) return null;

        // 1. Find all concept match intervals [start, end, concept]
        interface Interval {
            start: number;
            end: number;
            text: string;
            concept: ProcessedConcept;
        }

        const intervals: Interval[] = [];

        processedConcepts.forEach(c => {
            try {
                const regex = new RegExp(conceptToRegex(c.original), 'giu');
                let match;
                while ((match = regex.exec(para)) !== null) {
                    const matchedText = match[0];
                    const start = match.index;
                    const end = start + matchedText.length;

                    // Check overlap with existing intervals
                    const overlaps = intervals.some(inv => (start < inv.end && end > inv.start));
                    if (!overlaps) {
                        intervals.push({
                            start,
                            end,
                            text: matchedText,
                            concept: c
                        });
                    }
                }
            } catch {}
        });

        // Sort intervals by start position ascending
        intervals.sort((a, b) => a.start - b.start);

        // 2. Build React elements combining text slices and concept badges
        const elements: React.ReactNode[] = [];
        let cursor = 0;

        intervals.forEach((inv, invIdx) => {
            // Non-concept text before this interval
            if (inv.start > cursor) {
                const plainSlice = para.slice(cursor, inv.start);
                elements.push(
                    <React.Fragment key={`plain-${pIdx}-${cursor}`}>
                        {renderClickablePlainSlice(plainSlice, `p-${pIdx}-${cursor}`)}
                    </React.Fragment>
                );
            }

            // Concept badge interval
            const occurrences = conceptOccurrences.get(inv.concept.norm) || 1;
            const isMatchSearch = searchQuery.trim() && inv.concept.norm.includes(normalizeConcept(searchQuery));

            elements.push(
                <span
                    key={`concept-${pIdx}-${inv.start}`}
                    data-concept-norm={inv.concept.norm}
                    onClick={(e) => {
                        e.stopPropagation();
                        setActivePopoverConcept({
                            original: inv.concept.original,
                            hasDefinition: inv.concept.hasDefinition,
                            definition: inv.concept.definition,
                            occurrences
                        });
                    }}
                    title={`${inv.concept.original}: ${inv.concept.hasDefinition ? '✓ Tanımlı Kavram' : '⚠️ Tanımsız (Kelime Havuzunda)'} • Metinde ${occurrences} kez geçiyor`}
                    className={cn(
                        "inline-flex items-center gap-1 font-bold px-1.5 py-0.5 my-0.5 rounded-lg border transition-all duration-200 cursor-pointer select-none",
                        inv.concept.hasDefinition
                            ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                            : "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]",
                        isMatchSearch && "ring-2 ring-amber-400 bg-amber-500/30 text-amber-200 border-amber-400"
                    )}
                >
                    {inv.concept.hasDefinition ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                    ) : (
                        <Tag className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                    )}
                    <span>{inv.text}</span>
                </span>
            );

            cursor = inv.end;
        });

        // Remaining text after last interval
        if (cursor < para.length) {
            const trailing = para.slice(cursor);
            elements.push(
                <React.Fragment key={`plain-${pIdx}-${cursor}`}>
                    {renderClickablePlainSlice(trailing, `p-${pIdx}-${cursor}`)}
                </React.Fragment>
            );
        }

        return (
            <p
                key={`para-${pIdx}`}
                className="leading-relaxed mb-4 text-justify font-serif"
                style={{ fontSize: `${fontSizeMultiplier}rem`, lineHeight: `${fontSizeMultiplier * 1.85}rem` }}
            >
                {elements}
            </p>
        );
    };

    // Render plain text slices with clickable words & delimiters
    const renderClickablePlainSlice = (textSlice: string, keyPrefix: string) => {
        // Split by words vs non-words: preserves whitespace and punctuation
        const parts = textSlice.split(/([^\p{L}\p{N}\-_]+)/u);
        const normSearch = searchQuery.trim() ? normalizeConcept(searchQuery) : '';

        return parts.map((part, idx) => {
            if (!part) return null;
            const isWord = /[\p{L}\p{N}]/u.test(part);

            if (!isWord) {
                // Punctuation or whitespace
                return <span key={`${keyPrefix}-${idx}`}>{part}</span>;
            }

            // Clickable word token
            const cleaned = cleanWordForConcept(part);
            const isSearchMatch = normSearch && normalizeConcept(part).includes(normSearch);

            return (
                <span
                    key={`${keyPrefix}-${idx}`}
                    onClick={() => handleWordClick(part)}
                    title={fastClickMode ? `➕ Tıkla: "${cleaned}" kavram havuzuna eklensin` : `"${part}"`}
                    className={cn(
                        "transition-all duration-150 rounded px-0.5 cursor-pointer inline-block",
                        "hover:bg-purple-500/30 hover:text-white hover:ring-1 hover:ring-purple-400 hover:shadow-sm",
                        isSearchMatch && "bg-amber-500/40 text-amber-200 ring-2 ring-amber-400 font-bold"
                    )}
                >
                    {part}
                </span>
            );
        });
    };

    // Companion filtered concepts
    const filteredCompanionConcepts = useMemo(() => {
        const query = companionSearch.trim() ? normalizeConcept(companionSearch) : '';

        return processedConcepts.filter(c => {
            if (query && !c.norm.includes(query)) return false;

            const occurrences = conceptOccurrences.get(c.norm) || 0;
            if (filterCompanionTab === 'inText') return occurrences > 0;
            if (filterCompanionTab === 'notInText') return occurrences === 0;
            if (filterCompanionTab === 'undefined') return !c.hasDefinition;
            return true;
        });
    }, [processedConcepts, companionSearch, filterCompanionTab, conceptOccurrences]);

    return (
        <div className={cn("flex flex-col lg:flex-row gap-4 h-full w-full", className)}>
            
            {/* ════ SOL / ORTA ALAN: İNTERAKTİF DERS KİTABI METNİ & KAVRAM AVCISI ════ */}
            <div className="flex-1 flex flex-col bg-slate-950/70 border border-white/10 rounded-3xl overflow-hidden shadow-xl min-h-[500px]">
                
                {/* Metin Üst Araç Çubuğu */}
                <div className="p-3 sm:px-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                            <BookOpen className="w-4 h-4 text-emerald-400" />
                            <span>Ders Kitabı Metni</span>
                        </div>

                        <Badge className="bg-emerald-950/60 border-emerald-500/40 text-emerald-300 text-[10px] font-mono">
                            {wordCount} Kelime
                        </Badge>

                        <Badge className="bg-purple-950/60 border-purple-500/40 text-purple-300 text-[10px] font-bold">
                            ✓ {conceptsInTextCount} Kavram Tespit Edildi
                        </Badge>
                    </div>

                    {/* Sağ Kontroller: Arama, Boyut, Hızlı Tıklama, Metin Düzenle */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Metin İçi Arama */}
                        <div className="relative w-36 sm:w-44">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder="Metinde ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-7 text-xs pl-8 pr-2 bg-slate-950 border-white/10 rounded-xl focus:border-purple-400 text-white placeholder:text-slate-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Yazı Boyutu A- / A+ */}
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-xl border border-white/10 text-xs">
                            <button
                                onClick={() => setFontSizeMultiplier(f => Math.max(0.85, f - 0.1))}
                                className="w-5 h-5 rounded hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-center cursor-pointer"
                                title="Yazıyı Küçült"
                            >
                                -
                            </button>
                            <span className="font-mono text-cyan-300 text-[11px] w-7 text-center">
                                {fontSizeMultiplier.toFixed(1)}x
                            </span>
                            <button
                                onClick={() => setFontSizeMultiplier(f => Math.min(1.5, f + 0.1))}
                                className="w-5 h-5 rounded hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-center cursor-pointer"
                                title="Yazıyı Büyüt"
                            >
                                +
                            </button>
                        </div>

                        {/* Hızlı Tıkla-Ekle Modu Butonu */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setFastClickMode(!fastClickMode)}
                            className={cn(
                                "h-7 px-2.5 text-xs font-bold rounded-xl border cursor-pointer transition-all",
                                fastClickMode
                                    ? "bg-purple-950/60 border-purple-500/60 text-purple-300 hover:bg-purple-900/60 hover:text-white"
                                    : "border-white/10 text-slate-400 hover:text-white"
                            )}
                            title="Açıkken metindeki kelimelere tıklamak onları anında kavram havuzuna ekler"
                        >
                            <Zap className={cn("w-3 h-3 mr-1", fastClickMode && "text-amber-400 fill-amber-400")} />
                            {fastClickMode ? "Tıkla-Ekle: Açık" : "Tıkla-Ekle: Kapalı"}
                        </Button>

                        {/* Metni Düzenle Butonu */}
                        {onUpdateSourceText && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setEditTextValue(sourceText || '');
                                    setIsEditTextOpen(true);
                                }}
                                className="h-7 px-2 text-xs border-white/10 text-slate-300 hover:text-white bg-slate-950 rounded-xl cursor-pointer"
                                title="Kaynak metni düzenleyin veya yeni metin yapıştırın"
                            >
                                <Edit3 className="w-3 h-3 mr-1" />
                                Metni Düzenle
                            </Button>
                        )}
                    </div>
                </div>

                {/* Kullanıcı Rehberi Şeridi */}
                <div className="px-4 py-2 bg-slate-900/40 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                            <strong className="text-emerald-300">Yeşil:</strong> Tanımlı Kavram
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                            <strong className="text-cyan-300">Mavi:</strong> Tanımsız Kavram
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                            <strong className="text-purple-300">💡 İpucu:</strong> Metindeki herhangi bir kelimeye tıklayarak ya da fareyle seçerek anında kavrama ekleyebilirsiniz.
                        </span>
                    </div>

                    {selectedTextSnippet && (
                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border border-purple-500/50 px-2.5 py-1 rounded-xl animate-in fade-in-50 duration-200 shadow-lg">
                            <span className="text-xs text-purple-200">
                                Seçilen: <strong className="text-white">"{selectedTextSnippet}"</strong>
                            </span>
                            <Button
                                size="sm"
                                onClick={handleAddSelectedSnippet}
                                className="h-6 px-2 text-[10px] bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg cursor-pointer ml-1"
                            >
                                <Plus className="w-3 h-3 mr-0.5" /> Kavrama Ekle
                            </Button>
                            <button
                                onClick={() => setSelectedTextSnippet(null)}
                                className="text-slate-400 hover:text-white text-xs ml-1"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>

                {/* Metin Okuma & Kavram Avlama Gövdesi */}
                <div
                    ref={textContainerRef}
                    onMouseUp={handleMouseUp}
                    className="flex-1 p-6 sm:p-8 overflow-y-auto text-slate-200 selection:bg-purple-600 selection:text-white"
                >
                    {paragraphs.length > 0 ? (
                        paragraphs.map((p, idx) => renderParagraph(p, idx))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                            <BookOpen className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
                            <div className="space-y-1">
                                <h4 className="text-base font-bold text-slate-300">Kaynak Metin Henüz Bulunmuyor</h4>
                                <p className="text-xs text-slate-500 max-w-md">
                                    Bu konu için ders kitabı metni kaydedilmemiş. Aşağıdaki butona tıklayarak ders kitabındaki ilgili metni yapıştırabilirsiniz.
                                </p>
                            </div>
                            {onUpdateSourceText && (
                                <Button
                                    onClick={() => {
                                        setEditTextValue('');
                                        setIsEditTextOpen(true);
                                    }}
                                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Ders Kitabı Metnini Yapıştır
                                </Button>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* ════ SAĞ ALAN: CANLI KAVRAM HAVUZU & DETAY PANELİ ════ */}
            <div className="w-full lg:w-96 flex flex-col bg-slate-950/70 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex-shrink-0">
                
                {/* Panel Başlığı ve Hızlı AI Butonları */}
                <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-blue-400" />
                            <h3 className="text-sm font-bold text-white">Canlı Kavram Havuzu</h3>
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px] font-mono">
                                {processedConcepts.length}
                            </Badge>
                        </div>

                        {onRequestAiConcepts && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onRequestAiConcepts}
                                className="h-7 px-2 text-[11px] font-bold border-purple-500/40 text-purple-300 hover:bg-purple-950/60 hover:text-white rounded-xl cursor-pointer"
                                title="Metinden yapay zeka ile tüm eksik kavramları otomatik çıkar"
                            >
                                <Wand2 className="w-3 h-3 mr-1 text-purple-400" /> AI İle Çıkar
                            </Button>
                        )}
                    </div>

                    {/* Manuel Hızlı Kavram Ekleme */}
                    <div className="flex gap-1.5">
                        <Input
                            placeholder="Yeni kavram ekle (Enter)..."
                            value={newConceptManual}
                            onChange={(e) => setNewConceptManual(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newConceptManual.trim()) {
                                        onAddConcept(toConceptTitleCase(newConceptManual.trim()));
                                        setNewConceptManual('');
                                    }
                                }
                            }}
                            className="h-8 text-xs bg-slate-950 border-white/10 rounded-xl focus:border-blue-400 text-white placeholder:text-slate-500"
                        />
                        <Button
                            size="sm"
                            onClick={() => {
                                if (newConceptManual.trim()) {
                                    onAddConcept(toConceptTitleCase(newConceptManual.trim()));
                                    setNewConceptManual('');
                                }
                            }}
                            disabled={!newConceptManual.trim()}
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Filtre Sekmeleri: Tümü / Metinde Geçenler / Metin Harici / Tanımsız */}
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-[11px] font-medium overflow-x-auto">
                        <button
                            onClick={() => setFilterCompanionTab('all')}
                            className={cn(
                                "px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex-1 text-center",
                                filterCompanionTab === 'all' ? "bg-blue-600 text-white font-bold shadow" : "text-slate-400 hover:text-white"
                            )}
                        >
                            Tümü ({processedConcepts.length})
                        </button>
                        <button
                            onClick={() => setFilterCompanionTab('inText')}
                            className={cn(
                                "px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex-1 text-center",
                                filterCompanionTab === 'inText' ? "bg-emerald-600 text-white font-bold shadow" : "text-emerald-400 hover:text-white"
                            )}
                            title="Kaynak metinde tespit edilen kavramlar"
                        >
                            Metinde ({conceptsInTextCount})
                        </button>
                        <button
                            onClick={() => setFilterCompanionTab('notInText')}
                            className={cn(
                                "px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex-1 text-center",
                                filterCompanionTab === 'notInText' ? "bg-slate-700 text-white font-bold shadow" : "text-slate-400 hover:text-white"
                            )}
                            title="Kaynak metinde geçmeyen diğer kavramlar"
                        >
                            Harici ({conceptsNotInTextCount})
                        </button>
                        {missingDefinitionConcepts.length > 0 && (
                            <button
                                onClick={() => setFilterCompanionTab('undefined')}
                                className={cn(
                                    "px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center",
                                    filterCompanionTab === 'undefined' ? "bg-amber-600 text-white font-bold shadow" : "text-amber-400 hover:text-white"
                                )}
                                title="Tanımı henüz girilmemiş olan kavramlar"
                            >
                                ⚠️ ({missingDefinitionConcepts.length})
                            </button>
                        )}
                    </div>

                    {/* Eksik Tanımları AI İle Tamamlama Butonu */}
                    {missingDefinitionConcepts.length > 0 && onRequestAiMissingDefinitions && (
                        <Button
                            size="sm"
                            onClick={onRequestAiMissingDefinitions}
                            className="w-full h-7 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-[11px] rounded-xl shadow-md shadow-amber-950/50 cursor-pointer"
                        >
                            <Wand2 className="w-3 h-3 mr-1" /> Eksik Tanımları AI İle Yaz ({missingDefinitionConcepts.length})
                        </Button>
                    )}
                </div>

                {/* Arama Filtresi */}
                <div className="px-3 py-2 bg-slate-900/40 border-b border-white/5">
                    <Input
                        placeholder="Kavram listesinde ara..."
                        value={companionSearch}
                        onChange={(e) => setCompanionSearch(e.target.value)}
                        className="h-7 text-xs bg-slate-950 border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:border-blue-400"
                    />
                </div>

                {/* Kavram Kartları Listesi */}
                <div className="flex-1 p-3 overflow-y-auto space-y-2">
                    {filteredCompanionConcepts.length > 0 ? (
                        filteredCompanionConcepts.map((c, idx) => {
                            const occurrences = conceptOccurrences.get(c.norm) || 0;
                            return (
                                <div
                                    key={c.norm}
                                    className="bg-slate-900/90 border border-white/10 hover:border-blue-500/40 rounded-2xl p-2.5 transition-all flex flex-col gap-1.5 group"
                                >
                                    <div className="flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-bold text-xs text-white truncate">
                                                {c.original}
                                            </span>

                                            {occurrences > 0 ? (
                                                <button
                                                    onClick={() => handleScrollToConcept(c.original)}
                                                    className="text-[10px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.2 rounded hover:bg-emerald-900/80 font-mono flex items-center gap-0.5 cursor-pointer"
                                                    title="Metindeki yerine git"
                                                >
                                                    <ArrowUpRight className="w-2.5 h-2.5" /> {occurrences}x
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-500 font-mono" title="Metinde geçmiyor">
                                                    metin dışı
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {c.hasDefinition ? (
                                                <span className="text-[9px] bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                                                    ✓ Tanımlı
                                                </span>
                                            ) : (
                                                onOpenDefinitionCard && (
                                                    <button
                                                        onClick={() => onOpenDefinitionCard(c.original)}
                                                        className="text-[9px] bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                                                        title="Bu kavrama tanım yaz"
                                                    >
                                                        + Tanım Yaz
                                                    </button>
                                                )
                                            )}

                                            {onRemoveConcept && (
                                                <button
                                                    onClick={() => onRemoveConcept(c.original)}
                                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-opacity cursor-pointer"
                                                    title="Havuzdan Çıkar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tanım Önizleme */}
                                    {c.definition && (
                                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug pl-1 border-l-2 border-emerald-500/30">
                                            {c.definition}
                                        </p>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-slate-500 text-xs">
                            Kavram bulunamadı.
                        </div>
                    )}
                </div>

            </div>

            {/* ════ POPUP: METİNDEKİ KAVRAM DETAY & İŞLEM KARTI ════ */}
            {activePopoverConcept && (
                <Dialog open={Boolean(activePopoverConcept)} onOpenChange={(open) => !open && setActivePopoverConcept(null)}>
                    <DialogContent className="bg-slate-900 border border-white/10 text-white rounded-3xl max-w-md">
                        <DialogHeader>
                            <div className="flex items-center justify-between">
                                <Badge className={cn(
                                    "text-xs font-bold",
                                    activePopoverConcept.hasDefinition
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                )}>
                                    {activePopoverConcept.hasDefinition ? "✓ Tanımlı Kavram" : "🏷️ Kelime Havuzunda"}
                                </Badge>
                                <span className="text-xs text-slate-400 font-mono">
                                    Metinde {activePopoverConcept.occurrences} kez geçiyor
                                </span>
                            </div>
                            <DialogTitle className="text-xl font-black text-white mt-2">
                                {activePopoverConcept.original}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400">
                                Bu kavram MEB ders kitabı metninde ve etkinlik oyun havuzunda yer almaktadır.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-4 bg-slate-950/70 rounded-2xl border border-white/10 space-y-2">
                            <span className="text-xs font-bold text-slate-300">Kavram Tanımı:</span>
                            {activePopoverConcept.definition ? (
                                <p className="text-xs text-slate-200 leading-relaxed">
                                    {activePopoverConcept.definition}
                                </p>
                            ) : (
                                <p className="text-xs text-amber-300/80 italic">
                                    Bu kavram için henüz bir tanım girilmemiş. Tanım Kartına Git butonuna basarak tanım ekleyebilirsiniz.
                                </p>
                            )}
                        </div>

                        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                            {onRemoveConcept && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        onRemoveConcept(activePopoverConcept.original);
                                        setActivePopoverConcept(null);
                                        toast({
                                            title: "Kavram Çıkarıldı",
                                            description: `"${activePopoverConcept.original}" havuzdan çıkarıldı.`
                                        });
                                    }}
                                    className="border-red-500/30 text-red-400 hover:bg-red-950/40 hover:text-white rounded-xl text-xs cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Havuzdan Çıkar
                                </Button>
                            )}

                            <div className="flex items-center gap-2">
                                {onOpenDefinitionCard && (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const name = activePopoverConcept.original;
                                            setActivePopoverConcept(null);
                                            onOpenDefinitionCard(name);
                                        }}
                                        className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                                        {activePopoverConcept.hasDefinition ? "Tanımı Düzenle" : "Tanım Yaz"}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* ════ MODAL: KAYNAK METNİ DÜZENLE / YENİ METİN YAPIŞTIR ════ */}
            {onUpdateSourceText && (
                <Dialog open={isEditTextOpen} onOpenChange={setIsEditTextOpen}>
                    <DialogContent className="bg-slate-900 border border-white/10 text-white rounded-3xl max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-emerald-400" />
                                <span>MEB Ders Kitabı Kaynak Metnini Düzenle</span>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400">
                                Bu konuya ait orijinal ders kitabı metnini güncelleyebilir veya eksik metinleri buraya yapıştırabilirsiniz.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2">
                            <Textarea
                                rows={14}
                                value={editTextValue}
                                onChange={(e) => setEditTextValue(e.target.value)}
                                placeholder="Ders kitabındaki konu metnini buraya yapıştırın..."
                                className="bg-slate-950 border-white/10 text-xs text-white placeholder:text-slate-500 focus:border-purple-400 rounded-2xl font-serif leading-relaxed"
                            />
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>{editTextValue.trim().split(/\s+/).filter(Boolean).length} Kelime</span>
                                <span>{editTextValue.length} Karakter</span>
                            </div>
                        </div>

                        <DialogFooter className="flex items-center justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsEditTextOpen(false)}
                                className="border-white/10 text-slate-300 hover:text-white rounded-xl text-xs cursor-pointer"
                            >
                                İptal
                            </Button>
                            <Button
                                onClick={() => {
                                    onUpdateSourceText(editTextValue);
                                    setIsEditTextOpen(false);
                                    toast({
                                        title: "Kaynak Metin Güncellendi! ✓",
                                        description: "Kaynak metin güncellendi. Kalıcı olması için stüdyoyu kaydedin."
                                    });
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Kaydet & Uygula
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

        </div>
    );
}
