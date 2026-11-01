"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
    BookOpen, Pencil, Sparkles, Check, Bookmark, Star, Lightbulb, 
    Download, Maximize2, Minimize2, Plus, Minus, RotateCcw, 
    CheckCircle2, Loader2, Pin, ChevronLeft, ChevronRight, X, ZoomIn
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ══ 6 CANLI FOSFORLU VE DEFTER PALETİ ══
export const SKETCHNOTE_PALETTE = [
    {
        name: 'yellow',
        bg: 'bg-[#fefce8]',
        border: 'border-[#eab308]',
        borderHex: '#eab308',
        shadow: 'shadow-[3.5px_3.5px_0_#ca8a04]',
        numBg: 'bg-[#ca8a04]',
        badgeBg: 'bg-[#fde047]',
        badgeText: 'text-[#854d0e]',
        badgeBorder: 'border-[#ca8a04]',
        tape: 'washi-tape',
        highlightColor: 'yellow' as const,
        iconColor: 'text-[#ca8a04]',
        tagBg: 'bg-[#fef08a]',
        tagText: 'text-[#854d0e]',
        tagBorder: 'border-[#ca8a04]'
    },
    {
        name: 'cyan',
        bg: 'bg-[#f0f9ff]',
        border: 'border-[#0284c7]',
        borderHex: '#0284c7',
        shadow: 'shadow-[3.5px_3.5px_0_#0284c7]',
        numBg: 'bg-[#0284c7]',
        badgeBg: 'bg-[#bae6fd]',
        badgeText: 'text-[#075985]',
        badgeBorder: 'border-[#0284c7]',
        tape: 'washi-tape washi-tape-cyan',
        highlightColor: 'cyan' as const,
        iconColor: 'text-[#0284c7]',
        tagBg: 'bg-[#bae6fd]',
        tagText: 'text-[#075985]',
        tagBorder: 'border-[#0284c7]'
    },
    {
        name: 'pink',
        bg: 'bg-[#fdf2f8]',
        border: 'border-[#ec4899]',
        borderHex: '#ec4899',
        shadow: 'shadow-[3.5px_3.5px_0_#db2777]',
        numBg: 'bg-[#db2777]',
        badgeBg: 'bg-[#fbcfe8]',
        badgeText: 'text-[#9d174d]',
        badgeBorder: 'border-[#db2777]',
        tape: 'washi-tape washi-tape-pink',
        highlightColor: 'pink' as const,
        iconColor: 'text-[#db2777]',
        tagBg: 'bg-[#fbcfe8]',
        tagText: 'text-[#9d174d]',
        tagBorder: 'border-[#db2777]'
    },
    {
        name: 'green',
        bg: 'bg-[#f0fdf4]',
        border: 'border-[#16a34a]',
        borderHex: '#16a34a',
        shadow: 'shadow-[3.5px_3.5px_0_#16a34a]',
        numBg: 'bg-[#16a34a]',
        badgeBg: 'bg-[#bbf7d0]',
        badgeText: 'text-[#166534]',
        badgeBorder: 'border-[#16a34a]',
        tape: 'washi-tape washi-tape-green',
        highlightColor: 'green' as const,
        iconColor: 'text-[#16a34a]',
        tagBg: 'bg-[#bbf7d0]',
        tagText: 'text-[#166534]',
        tagBorder: 'border-[#16a34a]'
    },
    {
        name: 'orange',
        bg: 'bg-[#fff7ed]',
        border: 'border-[#ea580c]',
        borderHex: '#ea580c',
        shadow: 'shadow-[3.5px_3.5px_0_#ea580c]',
        numBg: 'bg-[#ea580c]',
        badgeBg: 'bg-[#fed7aa]',
        badgeText: 'text-[#9a3412]',
        badgeBorder: 'border-[#ea580c]',
        tape: 'washi-tape washi-tape-orange',
        highlightColor: 'orange' as const,
        iconColor: 'text-[#ea580c]',
        tagBg: 'bg-[#fed7aa]',
        tagText: 'text-[#9a3412]',
        tagBorder: 'border-[#ea580c]'
    },
    {
        name: 'purple',
        bg: 'bg-[#faf5ff]',
        border: 'border-[#9333ea]',
        borderHex: '#9333ea',
        shadow: 'shadow-[3.5px_3.5px_0_#9333ea]',
        numBg: 'bg-[#9333ea]',
        badgeBg: 'bg-[#e9d5ff]',
        badgeText: 'text-[#6b21a8]',
        badgeBorder: 'border-[#9333ea]',
        tape: 'washi-tape washi-tape-purple',
        highlightColor: 'purple' as const,
        iconColor: 'text-[#9333ea]',
        tagBg: 'bg-[#e9d5ff]',
        tagText: 'text-[#6b21a8]',
        tagBorder: 'border-[#9333ea]'
    }
];

// ══ AKILLI FOSFORLU METİN BİLEŞENİ ══
export function HighlightedText({
    text,
    highlightTerm,
    color = 'yellow',
    className = ''
}: {
    text: string;
    highlightTerm?: string;
    color?: 'yellow' | 'pink' | 'cyan' | 'green' | 'orange' | 'purple';
    className?: string;
}) {
    if (!text) return null;

    const hlClassMap: Record<string, string> = {
        yellow: 'hl-pen-yellow',
        pink: 'hl-pen-pink',
        cyan: 'hl-pen-cyan',
        green: 'hl-pen-green',
        orange: 'hl-pen-orange',
        purple: 'hl-pen-purple',
    };
    const hlClass = hlClassMap[color] || 'hl-pen-yellow';

    // HTML etiketleri içeriyorsa (<mark>, <b>, <strong> vb.)
    if (/<[a-z][\s\S]*>/i.test(text)) {
        const processed = text
            .replace(/<mark>/gi, `<span class="${hlClass}">`)
            .replace(/<\/mark>/gi, '</span>')
            .replace(/<strong>/gi, `<span class="${hlClassMap.cyan}">`)
            .replace(/<\/strong>/gi, '</span>')
            .replace(/<b>/gi, `<span class="${hlClassMap.pink}">`)
            .replace(/<\/b>/gi, '</span>');

        return <span className={className} dangerouslySetInnerHTML={{ __html: processed }} />;
    }

    // Vurgulanacak terimler (kavram terimi, tırnak içindeki kelimeler, başta iki nokta ile biten kelimeler)
    const termsToMatch: string[] = [];
    if (highlightTerm && highlightTerm.trim().length > 1) {
        termsToMatch.push(highlightTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    }

    const pattern = termsToMatch.length > 0
        ? new RegExp(`(“[^\”]+”|"[^"]+"|'[^']+'|\\b(?:${termsToMatch.join('|')})\\b|^[^:]{2,24}:)`, 'gi')
        : /(“[^\”]+”|"[^"]+"|^[^:]{2,24}:)/gi;

    const parts = text.split(pattern);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (!part) return null;
                const isQuote = (part.startsWith('"') && part.endsWith('"')) || (part.startsWith('“') && part.endsWith('”'));
                const isColonLabel = part.endsWith(':') && part.length < 25 && i <= 1;
                const isTerm = highlightTerm && part.toLowerCase() === highlightTerm.toLowerCase();

                if (isQuote || isTerm || isColonLabel) {
                    const cleanPart = isQuote ? part.slice(1, -1) : part;
                    return (
                        <span key={i} className={cn(hlClass, "mx-0.5 inline-block transform -rotate-0.5")}>
                            {cleanPart}
                        </span>
                    );
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </span>
    );
}

// ══ ANA SKETCHNOTE GÖRÜNTÜLEYİCİ BİLEŞEN ══
export interface SketchnoteNotesViewerProps {
    topicTitle: string;
    courseName?: string;
    unitName?: string;
    conceptDefinitions: { concept: string; definition: string }[];
    notes: string[];
    isFullscreen?: boolean;
    onToggleFullscreen?: () => void;
    activeSection?: 'all' | 'concepts' | 'notes';
    showToolbar?: boolean;
}

export function SketchnoteNotesViewer({
    topicTitle,
    courseName,
    unitName,
    conceptDefinitions,
    notes,
    isFullscreen = false,
    onToggleFullscreen,
    activeSection = 'all',
    showToolbar = true
}: SketchnoteNotesViewerProps) {
    const [fontSize, setFontSize] = useState(1.15);
    const [isDownloading, setIsDownloading] = useState(false);
    const [checkedNotes, setCheckedNotes] = useState<Record<number, boolean>>({});
    
    // ══ AKILLI TAHTA BÖLÜM ODAKLAMA & TAM EKRAN MODU ══
    const [focusState, setFocusState] = useState<{
        type: 'concept' | 'note';
        index: number;
    } | null>(null);
    const [focusScale, setFocusScale] = useState<number>(1.25);
    const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Responsive font boyutu
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth >= 1024) {
                setFontSize(1.35);
            } else if (window.innerWidth >= 768) {
                setFontSize(1.2);
            }
        }
    }, []);

    // Fullscreen Event Listener
    useEffect(() => {
        const onFsChange = () => {
            setIsBrowserFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Klavye Kısayolları (Bölüm Odak Modunda: Sağ/Sol Ok, Boşluk, ESC, +/-)
    useEffect(() => {
        if (!focusState) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setFocusState(null);
            } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                const maxIdx = focusState.type === 'concept' ? conceptDefinitions.length - 1 : notes.length - 1;
                setFocusState(prev => prev ? { ...prev, index: Math.min(maxIdx, prev.index + 1) } : null);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setFocusState(prev => prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null);
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                setFocusScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))));
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                setFocusScale(s => Math.max(0.85, Number((s - 0.15).toFixed(2))));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [focusState, conceptDefinitions.length, notes.length]);

    const toggleNoteCheck = (index: number) => {
        setCheckedNotes(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const toggleBrowserFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsBrowserFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsBrowserFullscreen(false);
        }
    };

    const hasConcepts = conceptDefinitions && conceptDefinitions.length > 0;
    const hasNotes = notes && notes.length > 0;

    // PDF İndir (Sketchnote & El Yazısı Teması Birebir Korunur)
    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.createElement('div');
            element.style.padding = '28px 24px';
            element.style.backgroundColor = '#f8fafc';
            element.style.backgroundImage = 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px), radial-gradient(#cbd5e1 1.2px, #f8fafc 1.2px)';
            element.style.backgroundSize = '24px 24px';
            element.style.color = '#1e293b';
            element.style.fontFamily = "'Patrick Hand', 'Neucha', cursive, sans-serif";

            let html = `
                <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Patrick+Hand&display=swap">
                <style>
                    * { box-sizing: border-box; }
                    .pdf-title-banner {
                        font-family: 'Caveat', cursive;
                        font-size: 28px;
                        font-weight: 700;
                        color: #0f172a;
                        background: #e0f2fe;
                        border: 2.5px solid #0284c7;
                        border-radius: 14px;
                        padding: 6px 20px;
                        box-shadow: 3px 3px 0 #0284c7;
                        display: inline-block;
                        text-align: center;
                    }
                    .pdf-badge {
                        background: #fde047;
                        border: 2px solid #1e293b;
                        color: #1e293b;
                        font-weight: bold;
                        padding: 3px 14px;
                        border-radius: 12px;
                        box-shadow: 2px 2px 0 #1e293b;
                        font-size: 13px;
                        display: inline-block;
                    }
                    .pdf-card {
                        border: 2.5px solid;
                        border-radius: 16px;
                        padding: 12px 16px;
                        margin-bottom: 12px;
                        page-break-inside: avoid;
                    }
                    .pdf-hl-yellow {
                        background: #fef08a;
                        color: #854d0e;
                        font-weight: bold;
                        padding: 1px 6px;
                        border-radius: 4px;
                    }
                </style>
                <div style="text-align: center; border-bottom: 2.5px dashed #94a3b8; padding-bottom: 16px; margin-bottom: 20px;">
                    <div style="margin-bottom: 8px;">
                        <span class="pdf-badge">📌 ${courseName || 'DİN KÜLTÜRÜ VE AHLAK BİLGİSİ'} ${unitName ? `| ${unitName}` : ''}</span>
                    </div>
                    <div class="pdf-title-banner">✏️ ${topicTitle}</div>
                    <p style="font-size: 12px; color: #64748b; margin-top: 6px; font-weight: 600;">Din Dersi Atölyesi | dindersiatolyesi.com - Akıllı Çalışma Fasikülü</p>
                </div>
            `;

            if (hasConcepts && (activeSection === 'all' || activeSection === 'concepts')) {
                html += `
                    <div style="margin-top: 15px; margin-bottom: 20px;">
                        <div style="font-family:'Caveat',cursive; font-size:22px; font-weight:700; color:#0369a1; border-left:4px solid #0284c7; padding-left:8px; margin-bottom:12px;">
                            📖 DİNİ KAVRAMLAR VE TANIMLARI
                        </div>
                `;
                conceptDefinitions.forEach((item, i) => {
                    const pal = SKETCHNOTE_PALETTE[i % SKETCHNOTE_PALETTE.length];
                    html += `
                        <div class="pdf-card" style="background:${pal.name === 'yellow' ? '#fefce8' : pal.name === 'pink' ? '#fdf2f8' : pal.name === 'green' ? '#f0fdf4' : pal.name === 'cyan' ? '#f0f9ff' : pal.name === 'orange' ? '#fff7ed' : '#faf5ff'}; border-color:${pal.borderHex}; box-shadow: 2.5px 2.5px 0 ${pal.borderHex};">
                            <span style="font-family:'Caveat',cursive; font-size:18px; font-weight:bold; background:${pal.name === 'yellow' ? '#fde047' : '#bae6fd'}; border:1.5px solid ${pal.borderHex}; padding:2px 10px; border-radius:12px; color:#0f172a; margin-right:8px;">
                                ${i + 1}. ${item.concept}
                            </span>
                            <span style="font-size:15px; color:#1e293b; line-height:1.4;">${item.definition}</span>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            if (hasNotes && (activeSection === 'all' || activeSection === 'notes')) {
                html += `
                    <div style="margin-top: 20px;">
                        <div style="font-family:'Caveat',cursive; font-size:22px; font-weight:700; color:#ca8a04; border-left:4px solid #eab308; padding-left:8px; margin-bottom:12px;">
                            ✏️ ÖNEMLİ DERS NOTLARI (DEFTERİMİZE YAZALIM)
                        </div>
                `;
                notes.forEach((note, i) => {
                    const pal = SKETCHNOTE_PALETTE[i % SKETCHNOTE_PALETTE.length];
                    html += `
                        <div class="pdf-card" style="background:${pal.name === 'yellow' ? '#fefce8' : pal.name === 'pink' ? '#fdf2f8' : pal.name === 'cyan' ? '#f0f9ff' : pal.name === 'green' ? '#f0fdf4' : pal.name === 'orange' ? '#fff7ed' : '#faf5ff'}; border-color:${pal.borderHex}; box-shadow: 2px 2px 0 ${pal.borderHex};">
                            <strong style="color:${pal.borderHex}; font-size:15px; margin-right:6px;">[${i + 1}]</strong>
                            <span style="font-size:15px; color:#1e293b; line-height:1.4;">${note}</span>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            html += `
                <div style="margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 10px; text-align: center; font-size: 11px; color: #94a3b8;">
                    Bu çalışma fasikülü dindersiatolyesi.com üzerinden öğrencilere özel el yazısı not tasarımıyla oluşturulmuştur.
                </div>
            `;

            element.innerHTML = html;
            const opt: any = {
                margin: 8,
                filename: `${topicTitle.replace(/\s+/g, '_')}_Ders_Notlari.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error("PDF export error:", err);
            alert("PDF belgesi oluşturulurken bir hata oluştu.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div 
            ref={containerRef}
            className={cn(
                "w-full min-h-screen sketchnote-paper relative select-none pb-28 pt-4 sm:pt-6 transition-all",
                isFullscreen ? "fixed inset-0 z-50 p-4 sm:p-6 overflow-y-auto" : ""
            )}
        >
            <div className="container mx-auto px-3 sm:px-6 max-w-7xl relative z-10 space-y-8">
                
                {/* ══ 1. ÜST BAŞLIK VE MARKA BÖLÜMÜ (NOT DEFTERİ BAŞLIĞI) ══ */}
                <div className="flex flex-col items-center justify-center text-center space-y-3 pb-4 border-b-[2.5px] border-dashed border-[#94a3b8] relative">
                    
                    {/* Sol/Üst: Sınıf & Ders Rozeti */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#fde047] border-[2px] border-[#1e293b] text-[#1e293b] font-handwriting font-bold text-xs sm:text-sm shadow-[2px_2px_0_#1e293b] transform -rotate-1">
                        <Pin className="w-3.5 h-3.5 fill-[#1e293b]" />
                        <span>{courseName ? `${courseName} / ` : ''}{unitName || 'Ders Notu'}</span>
                    </div>

                    {/* Ana Başlık Kapsülü (Caveat Fontlu, Mavi Çerçeveli, Solid Gölgeli) */}
                    <div className="relative inline-block max-w-3xl">
                        {/* Washi Bant Süsü */}
                        <div className="washi-tape" />
                        <h1 className="font-caveat font-extrabold text-3xl sm:text-4xl md:text-5xl text-[#0f172a] bg-[#e0f2fe] border-[2.5px] border-[#0284c7] px-6 sm:px-10 py-2 sm:py-3 rounded-2xl shadow-[3.5px_3.5px_0_#0284c7] leading-tight tracking-tight">
                            ✏️ {topicTitle}
                        </h1>
                    </div>

                    {/* Alt Bilgi & Fosforlu Şerit */}
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1">
                        <span className="font-caveat font-bold text-base sm:text-lg bg-[#fbcfe8] text-[#9d174d] border-[1.5px] border-[#db2777] px-3.5 py-0.5 rounded-full shadow-[2px_2px_0_#db2777] transform rotate-0.5">
                            ✨ El Yazısı & Kavram Panosu
                        </span>
                        <span className="font-handwriting font-semibold text-xs sm:text-sm text-slate-500">
                            • Akıllı tahtada büyütmek için kartların üzerindeki 🔍 büyütece dokunun
                        </span>
                    </div>
                </div>

                {/* ══ 2. KAVRAMLAR BÖLÜMÜ ══ */}
                {hasConcepts && (activeSection === 'all' || activeSection === 'concepts') && (
                    <section className="space-y-4">
                        
                        {/* Bölüm Başlık Şeridi + Bölümü Tam Ekran Yap / Odaklan Butonu */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-[#e0f2fe] border-[2px] border-[#0284c7] shadow-[2.5px_2.5px_0_#0284c7] transform -rotate-0.5">
                                <BookOpen className="w-5 h-5 text-[#0284c7]" />
                                <h2 className="font-caveat font-extrabold text-2xl sm:text-3xl text-[#0f172a] tracking-tight">
                                    Dini Kavramlar ve Tanımları
                                </h2>
                                <span className="font-handwriting font-bold px-2 py-0.5 rounded-full bg-[#0284c7] text-white text-xs">
                                    {conceptDefinitions.length} Kavram
                                </span>
                            </div>

                            {/* Akıllı Tahta Odak / Büyütme Başlık Butonu */}
                            <button
                                type="button"
                                onClick={() => setFocusState({ type: 'concept', index: 0 })}
                                className="font-caveat font-bold text-sm sm:text-base text-[#0284c7] hover:text-white bg-white hover:bg-[#0284c7] border-[2px] border-[#0284c7] px-3.5 py-1.5 rounded-xl shadow-[2.5px_2.5px_0_#0284c7] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                title="Akıllı Tahtada Kavramları Sunum Modunda Aç"
                            >
                                <Maximize2 className="w-4 h-4 stroke-[2.5]" />
                                <span>Bölümü Büyüt / Odaklan</span>
                            </button>
                        </div>

                        {/* Kavram Kartları Grid (255px_15px El Çizimi Wobbly Kenarlık & Fosforlu Kalem Vurgusu) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 items-stretch">
                            {conceptDefinitions.map((item, index) => {
                                const pal = SKETCHNOTE_PALETTE[index % SKETCHNOTE_PALETTE.length];
                                
                                // Başlık ayracı varsa
                                if (item.concept === '[BAŞLIK]') {
                                    return (
                                        <div key={index} className="col-span-full my-3 flex items-center gap-3">
                                            <div className="h-[2px] border-b-2 border-dashed border-[#94a3b8] flex-1" />
                                            <h3 className="font-caveat font-bold text-xl sm:text-2xl text-[#0369a1] px-4 py-1 rounded-xl bg-white border-2 border-[#0284c7] shadow-[2px_2px_0_#0284c7]">
                                                {item.definition}
                                            </h3>
                                            <div className="h-[2px] border-b-2 border-dashed border-[#94a3b8] flex-1" />
                                        </div>
                                    );
                                }

                                return (
                                    <div 
                                        key={index}
                                        className={cn(
                                            "sketchnote-box p-4 sm:p-5 flex flex-col justify-between group cursor-pointer transition-all duration-300 relative",
                                            pal.bg,
                                            pal.border,
                                            pal.shadow
                                        )}
                                        onClick={() => setFocusState({ type: 'concept', index })}
                                    >
                                        {/* Washi Bant veya Köşe Süsü */}
                                        <div className={pal.tape} />

                                        {/* Kart Başlığı & Numara Rozeti & Odaklan Butonu */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2.5 gap-2">
                                                {/* Fosforlu Kalemle Boyanmış Kavram Etiketi */}
                                                <div className="inline-flex items-center gap-1.5 flex-1 min-w-0">
                                                    <span className={cn(
                                                        "font-caveat font-extrabold text-xl sm:text-2xl px-2.5 py-0.5 rounded-lg border uppercase tracking-wide shadow-xs transform -rotate-1 transition-transform group-hover:rotate-0 truncate",
                                                        pal.tagBg,
                                                        pal.tagText,
                                                        pal.tagBorder
                                                    )}>
                                                        {item.concept}
                                                    </span>
                                                </div>

                                                {/* Sağ Üst: Odaklan Butonu + El Yazısı Numara Rozeti */}
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFocusState({ type: 'concept', index });
                                                        }}
                                                        className="p-1.5 rounded-lg bg-white/90 hover:bg-[#0284c7] text-[#0284c7] hover:text-white border border-[#0284c7]/50 shadow-xs transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
                                                        title="Akıllı Tahtada Bu Kavramı Büyüt / Odaklan"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                                    </button>
                                                    <div className={cn(
                                                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-caveat font-bold text-sm sm:text-base text-white shadow-xs border-2 border-white/70",
                                                        pal.numBg
                                                    )}>
                                                        {index + 1}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tanım Metni (El Yazısı Fontu + Otomatik Fosforlu Kalem Vurgusu) */}
                                            <div className="mt-2 text-slate-800 font-handwriting leading-relaxed text-justify">
                                                <p style={{ fontSize: `${fontSize}rem`, lineHeight: '1.45' }}>
                                                    <HighlightedText 
                                                        text={item.definition} 
                                                        highlightTerm={item.concept} 
                                                        color={pal.highlightColor}
                                                    />
                                                </p>
                                            </div>
                                        </div>

                                        {/* Alt Köşe: Minik İpucu / Odaklan Bildirimi */}
                                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-black/5 text-[11px] font-handwriting text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Sparkles className={cn("w-3.5 h-3.5", pal.iconColor)} />
                                                Anahtar Kavram
                                            </span>
                                            <span className="font-caveat font-bold text-xs opacity-60">Dokun: Büyüt 🔍</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ══ 3. ÖNEMLİ NOTLAR BÖLÜMÜ (DEFTERİMİZE YAZALIM) ══ */}
                {hasNotes && (activeSection === 'all' || activeSection === 'notes') && (
                    <section className="space-y-4 pt-4">
                        
                        {/* Bölüm Başlık Şeridi + Bölümü Tam Ekran Yap / Odaklan Butonu */}
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl bg-[#fef08a] border-[2px] border-[#eab308] shadow-[2.5px_2.5px_0_#ca8a04] transform rotate-0.5">
                                <Pencil className="w-5 h-5 text-[#854d0e]" />
                                <h2 className="font-caveat font-extrabold text-2xl sm:text-3xl text-[#0f172a] tracking-tight">
                                    Önemli Notlar (Defterimize Yazalım)
                                </h2>
                                <span className="font-handwriting font-bold px-2 py-0.5 rounded-full bg-[#ca8a04] text-white text-xs">
                                    {notes.length} Madde
                                </span>
                            </div>

                            {/* Akıllı Tahta Odak / Büyütme Başlık Butonu */}
                            <button
                                type="button"
                                onClick={() => setFocusState({ type: 'note', index: 0 })}
                                className="font-caveat font-bold text-sm sm:text-base text-[#854d0e] hover:text-white bg-white hover:bg-[#ca8a04] border-[2px] border-[#eab308] px-3.5 py-1.5 rounded-xl shadow-[2.5px_2.5px_0_#ca8a04] transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                                title="Akıllı Tahtada Notları Sunum Modunda Aç"
                            >
                                <Maximize2 className="w-4 h-4 stroke-[2.5]" />
                                <span>Bölümü Büyüt / Odaklan</span>
                            </button>
                        </div>

                        {/* Notlar Kartları (Yapışkan Not / Post-It & Defter Kağıdı Hissi) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 items-stretch">
                            {notes.map((note, index) => {
                                const isChecked = checkedNotes[index] || false;
                                const pal = SKETCHNOTE_PALETTE[index % SKETCHNOTE_PALETTE.length];
                                
                                // Başlık Ayracı ise
                                if (note.startsWith('[BAŞLIK]')) {
                                    const title = note.replace('[BAŞLIK]', '').trim();
                                    return (
                                        <div key={index} className="col-span-full my-3 flex items-center gap-3">
                                            <div className="h-[2px] border-b-2 border-dashed border-[#eab308] flex-1" />
                                            <h3 className="font-caveat font-bold text-xl sm:text-2xl text-[#854d0e] px-4 py-1 rounded-xl bg-[#fefce8] border-2 border-[#eab308] shadow-[2px_2px_0_#ca8a04]">
                                                {title}
                                            </h3>
                                            <div className="h-[2px] border-b-2 border-dashed border-[#eab308] flex-1" />
                                        </div>
                                    );
                                }

                                const rotations = ['-rotate-[0.4deg]', 'rotate-[0.5deg]', '-rotate-[0.6deg]', 'rotate-[0.4deg]'];
                                const cardRotation = rotations[index % rotations.length];

                                return (
                                    <div 
                                        key={index}
                                        onClick={() => toggleNoteCheck(index)}
                                        className={cn(
                                            "sketchnote-box p-4 sm:p-5 flex items-start gap-3.5 sm:gap-4 group cursor-pointer transition-all duration-300 relative",
                                            pal.bg,
                                            pal.border,
                                            pal.shadow,
                                            cardRotation,
                                            isChecked ? "opacity-65 line-through bg-slate-100/90 border-slate-400 shadow-[1px_1px_0_#94a3b8]" : ""
                                        )}
                                    >
                                        {/* Üstte Kırmızı/Sarı Raptiye Simülasyonu */}
                                        <div className="absolute -top-3 left-6 text-sm select-none pointer-events-none drop-shadow-xs">
                                            📌
                                        </div>

                                        {/* Sol: Büyük El Çizimi Numara Rozeti */}
                                        <div className={cn(
                                            "w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-caveat font-black text-lg sm:text-xl text-white shadow-xs border-2 border-white/70 flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105",
                                            isChecked ? "bg-slate-500" : pal.numBg
                                        )}>
                                            {isChecked ? <Check className="w-5 h-5 stroke-[3]" /> : index + 1}
                                        </div>

                                        {/* Orta: Not Metni (El Yazısı + Fosforlu Kalem Vurguları) */}
                                        <div className="flex-1 min-w-0">
                                            <p 
                                                className={cn(
                                                    "font-handwriting font-semibold leading-relaxed text-justify",
                                                    isChecked ? "text-slate-500" : "text-slate-900"
                                                )}
                                                style={{ fontSize: `${fontSize}rem`, lineHeight: '1.45' }}
                                            >
                                                <HighlightedText 
                                                    text={note} 
                                                    color={pal.highlightColor}
                                                />
                                            </p>
                                        </div>

                                        {/* Sağ: Büyüt Butonu + İnteraktif Tamamlama Onayı */}
                                        <div className="flex-shrink-0 flex items-center gap-1.5 pt-0.5">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFocusState({ type: 'note', index });
                                                }}
                                                className="p-1.5 rounded-lg bg-white/90 hover:bg-[#ca8a04] text-[#854d0e] hover:text-white border border-[#eab308]/60 shadow-xs transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
                                                title="Akıllı Tahtada Bu Notu Büyüt / Odaklan"
                                            >
                                                <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                            
                                            <div className={cn(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                isChecked 
                                                    ? "bg-emerald-500 border-emerald-600 text-white" 
                                                    : "border-slate-300 bg-white/80 group-hover:border-slate-400"
                                            )}>
                                                {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Eğer henüz veri yoksa */}
                {!hasConcepts && !hasNotes && (
                    <div className="text-center py-16 px-4 bg-white/70 rounded-3xl border-2 border-dashed border-slate-300">
                        <Pencil className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <h3 className="font-caveat font-bold text-2xl text-slate-700">Henüz ders notu eklenmemiş</h3>
                        <p className="font-handwriting text-slate-500">Bu konuya ait kavram veya defter notu henüz yüklenmedi.</p>
                    </div>
                )}
            </div>

            {/* ══ 4. YÜZER SKETCHNOTE ARAÇ ÇUBUĞU (PUNTO & PDF & TAM EKRAN) ══ */}
            {showToolbar && (
                <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 p-1.5 rounded-2xl bg-white/95 border-[2px] border-[#1e293b] shadow-[3.5px_3.5px_0_#1e293b] backdrop-blur-md">
                    {/* Punto Küçült */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setFontSize(s => Math.max(0.85, Number((s - 0.1).toFixed(2))))}
                        className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-800"
                        title="Yazıyı Küçült"
                    >
                        <Minus className="h-4 w-4 stroke-[2.5]" />
                    </Button>

                    <span className="font-caveat font-bold text-sm text-[#0369a1] w-12 text-center select-none uppercase">
                        YAZI
                    </span>

                    {/* Punto Büyüt */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setFontSize(s => Math.min(2.8, Number((s + 0.1).toFixed(2))))}
                        className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-800"
                        title="Yazıyı Büyüt"
                    >
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                    </Button>

                    <div className="w-[1.5px] h-6 bg-slate-300 mx-1" />

                    {/* PDF İndir */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="h-9 w-9 rounded-xl bg-[#fde047] hover:bg-[#facc15] text-[#1e293b] border border-[#ca8a04]"
                        title="Renkli Ders Notunu PDF İndir"
                    >
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 stroke-[2.5]" />}
                    </Button>

                    {/* Akıllı Tahta Odak / Sunum Modu */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                            if (hasConcepts) setFocusState({ type: 'concept', index: 0 });
                            else if (hasNotes) setFocusState({ type: 'note', index: 0 });
                        }}
                        className="h-9 w-9 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs"
                        title="Akıllı Tahta Sunum / Odak Modunu Başlat"
                    >
                        <ZoomIn className="h-4 w-4 stroke-[2.5]" />
                    </Button>

                    {/* Sayfa Tam Ekran */}
                    {onToggleFullscreen && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onToggleFullscreen}
                            className="h-9 w-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                            title="Tam Ekran"
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                    )}
                </div>
            )}

            {/* ══ 5. AKILLI TAHTA BÖLÜM BÜYÜTME & ODAKLANMA MODALI (ÖZETLERDEKİ BİREBİR SİSTEM) ══ */}
            {focusState && (() => {
                const isConcept = focusState.type === 'concept';
                const totalItems = isConcept ? conceptDefinitions.length : notes.length;
                const currentIndex = focusState.index;
                const pal = SKETCHNOTE_PALETTE[currentIndex % SKETCHNOTE_PALETTE.length];

                const currentConcept = isConcept ? conceptDefinitions[currentIndex] : null;
                const currentNote = !isConcept ? notes[currentIndex] : '';

                return (
                    <div 
                        className="fixed inset-0 z-[200] bg-slate-950/96 backdrop-blur-2xl flex flex-col p-3 sm:p-5 text-white select-none overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setFocusState(null);
                        }}
                    >
                        {/* ══ SMARTBOARD ÜST ARAÇ ÇUBUĞU ══ */}
                        <div className="w-full bg-[#0f172a] border-2 border-[#334155] rounded-2xl p-2.5 sm:px-5 sm:py-2.5 flex items-center justify-between gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex-shrink-0 flex-wrap">
                            
                            {/* Sol: Logo + Sayaç + Başlık */}
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <span className="bg-[#0284c7] text-white font-bold text-xs sm:text-sm px-3 py-1 rounded-xl border border-[#38bdf8] flex items-center gap-1.5 flex-shrink-0">
                                    🕌 DinDersi Atölyesi
                                </span>
                                
                                <span className="bg-[#fde047] text-[#1e293b] font-bold text-xs sm:text-sm px-3 py-1 rounded-xl border-1.5 border-[#1e293b] flex-shrink-0">
                                    📌 {currentIndex + 1} / {totalItems}
                                </span>

                                <strong className="font-caveat font-extrabold text-xl sm:text-2xl text-[#38bdf8] truncate hidden md:inline">
                                    {isConcept ? currentConcept?.concept : 'Önemli Ders Notu'}
                                </strong>
                            </div>

                            {/* Sağ: Punto / Navigasyon / Tam Ekran / Kapat Kontrolleri */}
                            <div className="flex items-center gap-2 flex-wrap">
                                
                                {/* Punto Kontrolü */}
                                <div className="hidden sm:flex items-center gap-1 bg-white/5 px-2 py-1 rounded-xl border border-white/10 text-xs">
                                    <span className="text-slate-400 mr-1 font-semibold">🔍 Boyut:</span>
                                    <button 
                                        type="button" 
                                        onClick={() => setFocusScale(s => Math.max(0.85, Number((s - 0.15).toFixed(2))))}
                                        className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-[#0284c7] text-white font-bold transition-colors cursor-pointer"
                                        title="Yazıyı Küçült"
                                    >
                                        A-
                                    </button>
                                    <span className="font-mono font-bold text-[#fde047] w-12 text-center text-xs">
                                        {Math.round(focusScale * 100)}%
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={() => setFocusScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
                                        className="h-7 px-2 rounded-lg bg-slate-800 hover:bg-[#0284c7] text-white font-bold transition-colors cursor-pointer"
                                        title="Yazıyı Büyüt"
                                    >
                                        A+
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setFocusScale(1.25)}
                                        className="h-7 px-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-[11px] cursor-pointer"
                                        title="Sıfırla"
                                    >
                                        100%
                                    </button>
                                </div>

                                {/* Önceki / Sonraki Butonları */}
                                <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-xl border border-white/10">
                                    <button
                                        type="button"
                                        disabled={currentIndex === 0}
                                        onClick={() => setFocusState(prev => prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null)}
                                        className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-[#0284c7] disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-handwriting font-bold text-xs sm:text-sm transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Önceki (Sol Ok)"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="hidden sm:inline">Önceki</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={currentIndex === totalItems - 1}
                                        onClick={() => setFocusState(prev => prev ? { ...prev, index: Math.min(totalItems - 1, prev.index + 1) } : null)}
                                        className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-[#0284c7] disabled:opacity-30 disabled:hover:bg-slate-800 text-white font-handwriting font-bold text-xs sm:text-sm transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Sonraki (Sağ Ok veya Boşluk)"
                                    >
                                        <span className="hidden sm:inline">Sonraki</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Tam Ekran Toggle */}
                                <button
                                    type="button"
                                    onClick={toggleBrowserFullscreen}
                                    className="h-8 px-3 rounded-xl bg-[#4338ca] hover:bg-[#4f46e5] text-white font-handwriting font-bold text-xs sm:text-sm transition-all border border-[#6366f1] flex items-center gap-1 cursor-pointer shadow-sm"
                                    title="Tarayıcıyı Tam Ekran Yap"
                                >
                                    {isBrowserFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                    <span className="hidden sm:inline">Tam Ekran</span>
                                </button>

                                {/* Kapat */}
                                <button
                                    type="button"
                                    onClick={() => setFocusState(null)}
                                    className="h-8 px-3 rounded-xl bg-[#991b1b] hover:bg-[#b91c1c] text-white font-handwriting font-bold text-xs sm:text-sm transition-all border border-[#ef4444] flex items-center gap-1 cursor-pointer shadow-sm"
                                    title="Kapat (ESC)"
                                >
                                    <X className="w-4 h-4 stroke-[3]" />
                                    <span>Kapat</span>
                                </button>
                            </div>
                        </div>

                        {/* ══ MERKEZ SAHNE (BÜYÜTÜLMÜŞ KART) ══ */}
                        <div className="flex-1 w-full flex items-center justify-center p-2 sm:p-6 overflow-y-auto min-h-0">
                            <div 
                                className={cn(
                                    "w-full max-w-4xl my-auto p-6 sm:p-10 rounded-[30px] border-[3.5px] shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative transition-all duration-300",
                                    pal.bg,
                                    pal.border
                                )}
                                style={{
                                    boxShadow: `0 20px 60px rgba(0,0,0,0.4), 6px 6px 0 ${pal.borderHex}`
                                }}
                            >
                                {/* Washi Bant */}
                                <div className={pal.tape} style={{ width: '100px', height: '24px', top: '-12px' }} />

                                {/* Kart Başlığı ve Sayaç Rozeti */}
                                <div className="flex items-center justify-between gap-4 border-b-2 border-dashed border-black/15 pb-4 mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center font-caveat font-black text-2xl text-white shadow-md border-2 border-white/80",
                                            pal.numBg
                                        )}>
                                            {currentIndex + 1}
                                        </div>
                                        <div>
                                            <span className="font-handwriting text-xs sm:text-sm text-slate-500 font-bold block">
                                                {isConcept ? 'DİNİ KAVRAM' : 'ÖNEMLİ DERS NOTU'}
                                            </span>
                                            <h3 
                                                className="font-caveat font-extrabold text-[#0f172a] tracking-tight leading-none"
                                                style={{ fontSize: `calc(32px * ${focusScale})` }}
                                            >
                                                {isConcept ? currentConcept?.concept : `Not #${currentIndex + 1}`}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Rozet */}
                                    <span className={cn(
                                        "font-caveat font-bold text-base sm:text-lg px-4 py-1 rounded-xl border shadow-xs transform rotate-1 hidden sm:inline-block",
                                        pal.tagBg,
                                        pal.tagText,
                                        pal.tagBorder
                                    )}>
                                        {isConcept ? '✨ Temel Tanım' : '✏️ Defter Notu'}
                                    </span>
                                </div>

                                {/* İçerik Metni */}
                                <div className="py-2">
                                    {isConcept && currentConcept && (
                                        <div className="space-y-4">
                                            <div className="inline-block mb-1">
                                                <span 
                                                    className={cn(
                                                        "font-caveat font-extrabold px-4 py-1 rounded-xl border uppercase tracking-wide shadow-sm inline-block transform -rotate-0.5",
                                                        pal.tagBg,
                                                        pal.tagText,
                                                        pal.tagBorder
                                                    )}
                                                    style={{ fontSize: `calc(26px * ${focusScale})` }}
                                                >
                                                    {currentConcept.concept}
                                                </span>
                                            </div>

                                            <p 
                                                className="font-handwriting font-medium text-slate-900 leading-relaxed text-justify"
                                                style={{ 
                                                    fontSize: `calc(22px * ${focusScale})`,
                                                    lineHeight: '1.55'
                                                }}
                                            >
                                                <HighlightedText 
                                                    text={currentConcept.definition} 
                                                    highlightTerm={currentConcept.concept} 
                                                    color={pal.highlightColor}
                                                />
                                            </p>
                                        </div>
                                    )}

                                    {!isConcept && (
                                        <p 
                                            className="font-handwriting font-semibold text-slate-900 leading-relaxed text-justify"
                                            style={{ 
                                                fontSize: `calc(22px * ${focusScale})`,
                                                lineHeight: '1.55'
                                            }}
                                        >
                                            <HighlightedText 
                                                text={currentNote} 
                                                color={pal.highlightColor}
                                            />
                                        </p>
                                    )}
                                </div>

                                {/* Alt Bar: Adım Noktaları ve Hızlı İlerleme */}
                                <div className="flex items-center justify-between pt-6 mt-4 border-t border-black/10 gap-2 flex-wrap">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {Array.from({ length: totalItems }).map((_, dotIdx) => (
                                            <button
                                                key={dotIdx}
                                                type="button"
                                                onClick={() => setFocusState(prev => prev ? { ...prev, index: dotIdx } : null)}
                                                className={cn(
                                                    "w-7 h-7 rounded-lg font-caveat font-bold text-xs flex items-center justify-center transition-all cursor-pointer",
                                                    dotIdx === currentIndex
                                                        ? cn("text-white shadow-sm scale-110", pal.numBg)
                                                        : "bg-black/5 hover:bg-black/10 text-slate-600"
                                                )}
                                                title={`Adım ${dotIdx + 1}'e Git`}
                                            >
                                                {dotIdx + 1}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="font-handwriting text-xs text-slate-400 hidden sm:inline">
                                            İpucu: Sonraki için <strong>Boşluk</strong> veya <strong>Sağ Ok</strong> tuşuna basın
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
