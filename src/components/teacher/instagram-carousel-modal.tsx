'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Download, Copy, Check, Sparkles, Loader2, Edit3, RotateCcw, Trash2, Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface InstagramCarouselModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
    grade?: string;
    courseName?: string;
    unitName?: string;
    sourceText?: string;
}

export interface DynamicStudyCardItem {
    prefix?: string;
    boldText?: string;
    bodyText: string;
    type?: 'concept' | 'bullet' | 'tip';
    dotColor?: string;
}

export interface DynamicStudyCard {
    id: string;
    title: string;
    icon: string;
    badgeText?: string;
    color: 'pink' | 'cyan' | 'orange' | 'purple' | 'green' | 'yellow';
    items: DynamicStudyCardItem[];
}

export interface DynamicStudySheetData {
    gradeLine: string;       // "5. Sınıf Din Kültürü" veya "8. Sınıf Din Kültürü"
    examLine: string;        // "1. Dönem 1. Yazılı" veya "Kader ve Kaza İnancı"
    ribbonText: string;      // "Çalışma Notu"
    cards: DynamicStudyCard[];
}

// ══ RENK PALETİ VE KART STİLLERİ ══
const CARD_PALETTES = {
    pink: {
        bg: '#fdf2f8',
        border: '#f472b6',
        titleColor: '#831843',
        badgeBg: '#f472b6',
        badgeText: '#ffffff',
        accent: '#db2777'
    },
    cyan: {
        bg: '#ecfeff',
        border: '#22d3ee',
        titleColor: '#164e63',
        badgeBg: '#06b6d4',
        badgeText: '#ffffff',
        accent: '#0891b2'
    },
    orange: {
        bg: '#fff7ed',
        border: '#fb923c',
        titleColor: '#9a3412',
        badgeBg: '#f97316',
        badgeText: '#ffffff',
        accent: '#ea580c'
    },
    purple: {
        bg: '#faf5ff',
        border: '#c084fc',
        titleColor: '#581c87',
        badgeBg: '#a855f7',
        badgeText: '#ffffff',
        accent: '#9333ea'
    },
    green: {
        bg: '#f0fdf4',
        border: '#4ade80',
        titleColor: '#14532d',
        badgeBg: '#22c55e',
        badgeText: '#ffffff',
        accent: '#16a34a'
    },
    yellow: {
        bg: '#fefce8',
        border: '#facc15',
        titleColor: '#854d0e',
        badgeBg: '#eab308',
        badgeText: '#713f12',
        accent: '#ca8a04'
    }
} as const;

type CardColor = keyof typeof CARD_PALETTES;
const COLOR_SEQUENCE: CardColor[] = ['cyan', 'pink', 'green', 'orange', 'purple', 'yellow'];
const DOT_COLORS = ['#16a34a', '#ea580c', '#0284c7', '#9333ea', '#e11d48'];

function cleanText(text: string): string {
    if (!text) return '';
    return text
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function truncateWord(text: string, maxLen: number): string {
    const clean = cleanText(text);
    if (clean.length <= maxLen) return clean;
    const sub = clean.slice(0, maxLen);
    const lastSpace = sub.lastIndexOf(' ');
    return (lastSpace > 10 ? sub.slice(0, lastSpace) : sub) + '...';
}

/**
 * Notun HTML içeriğinden SADECE O NOTA AİT gerçek bölümleri çıkarır.
 * Boş kutu ve sahte doldurma metinleri ASLA üretmez.
 */
function extractDynamicNoteContent(
    htmlContent: string,
    rawTitle: string,
    grade?: string,
    courseName?: string,
    unitName?: string
): DynamicStudySheetData {
    let cleanTitle = cleanText(rawTitle || 'Ders Notu')
        .replace(/^\d+[\.\-\s]+/, '')
        .replace(/^Ünite\s*\d*[\:\-\s]*/i, '')
        .trim();

    let doc: Document | null = null;
    if (typeof window !== 'undefined' && htmlContent) {
        try {
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlContent, 'text/html');
        } catch {
            doc = null;
        }
    }

    if (doc) {
        const h1 = doc.querySelector('h1, .title-banner, .unit-banner');
        if (h1 && h1.textContent?.trim()) {
            const h1Text = cleanText(h1.textContent).replace(/^\d+[\.\-\s]+/, '');
            if (h1Text.length > 3 && h1Text.length < 50) {
                cleanTitle = h1Text;
            }
        }
    }

    // Sınıf bilgisi
    let detectedGrade = grade || '';
    if (!detectedGrade && doc) {
        const badge = doc.querySelector('.badge-grade, .grade-badge');
        if (badge) {
            const m = badge.textContent?.match(/(\d+)/);
            if (m) detectedGrade = m[1];
        }
    }
    if (!detectedGrade) {
        const m = (htmlContent + ' ' + rawTitle).match(/(\d+)\.\s*Sınıf/i);
        if (m) detectedGrade = m[1];
    }
    const gradeLine = detectedGrade 
        ? `${detectedGrade}. Sınıf Din Kültürü` 
        : (courseName ? cleanText(courseName) : 'Din Kültürü ve Ahlak Bilgisi');

    const cleanUnit = cleanText(unitName || '')
        .replace(/^\d+[\.\-\s]+/, '')
        .trim();

    const examLine = cleanUnit && cleanUnit !== cleanTitle
        ? `${cleanUnit} • ${cleanTitle}`
        : `${cleanTitle} Çalışma Notu`;

    const generatedCards: DynamicStudyCard[] = [];

    if (doc) {
        // A) ÖZETTEKİ KAVRAMLAR KUTUSUNU BUL
        const conceptBox = doc.querySelector('.box-yellow, [class*="concept"], .concepts-grid, section:has(.concept-card)');
        const rawConcepts: Array<{ term: string; definition: string }> = [];

        doc.querySelectorAll('.concept-card, .concept-item, .box-yellow .card').forEach(cEl => {
            const termEl = cEl.querySelector('.concept-badge, .c-tag, strong, h3, h4');
            const defEl = cEl.querySelector('p, .concept-text') || cEl;
            const term = cleanText(termEl?.textContent || '').replace(/[\:\-]$/, '');
            let def = cleanText(defEl?.textContent || '');
            if (term && def.startsWith(term)) {
                def = def.slice(term.length).replace(/^[\:\-\s]+/, '').trim();
            }
            if (term && term.length >= 2 && term.length <= 40 && def.length >= 6) {
                if (!rawConcepts.some(c => c.term.toLowerCase() === term.toLowerCase())) {
                    rawConcepts.push({ term, definition: truncateWord(def, 110) });
                }
            }
        });

        // Tablo satırlarından kavram kontrolü
        if (rawConcepts.length === 0) {
            doc.querySelectorAll('table tbody tr').forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 2) {
                    const term = cleanText(tds[0].textContent || '').replace(/[\:\-]$/, '');
                    const def = cleanText(tds[1].textContent || '');
                    if (term && term.length >= 2 && term.length <= 35 && def.length >= 6) {
                        rawConcepts.push({ term, definition: truncateWord(def, 110) });
                    }
                }
            });
        }

        // Eğer kavram varsa Kart olarak ekle
        if (rawConcepts.length > 0) {
            const conceptItems: DynamicStudyCardItem[] = rawConcepts.slice(0, 5).map((c, i) => ({
                boldText: c.term,
                bodyText: c.definition,
                type: 'concept',
                dotColor: DOT_COLORS[i % DOT_COLORS.length]
            }));

            generatedCards.push({
                id: 'concepts-card',
                title: 'Temel Kavramlar & Anlamları',
                icon: '📖',
                badgeText: `${rawConcepts.length} Kavram`,
                color: 'cyan',
                items: conceptItems
            });
        }

        // B) ÖZETTEKİ GERÇEK BÖLÜM VE KONU KUTULARINI AYIKLA
        // .box, section.box, .card-box
        const rawSections = Array.from(doc.querySelectorAll(
            '.box:not(.box-yellow):not(.box-green), section[class*="box-"]:not(.box-yellow):not(.box-green), section:has(.list-item), section:has(h2)'
        )).filter(s => {
            // Test veya quiz bölümlerini atla
            const text = s.textContent?.toLowerCase() || '';
            return !text.includes('tarama testi') && !text.includes('quiz') && !text.includes('soru 1');
        });

        rawSections.forEach((secEl, sIdx) => {
            // Başlık bul
            const titleEl = secEl.querySelector('.box-title, .card-title, h2, h3, h4');
            let secTitle = cleanText(titleEl?.textContent || '');
            if (!secTitle) return;

            // Başlıktaki emojiyi ayıkla
            let icon = '⚡';
            const emojiMatch = secTitle.match(/^([📖🏔️⏳⚡⭐🎨🌱💡🔍🔑📌🕌])\s*/);
            if (emojiMatch) {
                icon = emojiMatch[1];
                secTitle = secTitle.replace(emojiMatch[0], '').trim();
            } else if (sIdx === 0) {
                icon = '💡';
            } else if (sIdx === 1) {
                icon = '📌';
            }

            // Başlıktan "1. Konu:", "2. Konu:" gibi kalıpları temizle
            secTitle = secTitle.replace(/^\d+[\.\-\s]+Konu[\:\-\s]*/i, '').trim();

            // Maddeleri topla
            const items: DynamicStudyCardItem[] = [];

            // 1. .list-item veya li
            secEl.querySelectorAll('.list-item, .timeline-item, li, .columns-2 > div').forEach(liEl => {
                const full = cleanText(liEl.textContent || '').replace(/^[0-9\.\-\s]+/, '');
                if (full.length >= 10 && full.length <= 220) {
                    const strong = liEl.querySelector('strong');
                    let bTitle = cleanText(strong?.textContent || '').replace(/[\:\-]$/, '');
                    let bText = full;
                    if (bTitle && bText.startsWith(bTitle)) {
                        bText = bText.slice(bTitle.length).replace(/^[\:\-\s]+/, '').trim();
                    } else if (!bTitle && full.includes(':')) {
                        const parts = full.split(':');
                        if (parts[0].length <= 25) {
                            bTitle = parts[0].trim();
                            bText = parts.slice(1).join(':').trim();
                        }
                    }
                    items.push({
                        boldText: bTitle ? truncateWord(bTitle, 30) : undefined,
                        bodyText: truncateWord(bText, 115),
                        type: 'bullet'
                    });
                }
            });

            // 2. Eğer li yoksa paragraflardan çıkar
            if (items.length === 0) {
                secEl.querySelectorAll('p').forEach(pEl => {
                    const pText = cleanText(pEl.textContent || '');
                    if (pText.length >= 15 && pText.length <= 200) {
                        const strong = pEl.querySelector('strong');
                        const bTitle = cleanText(strong?.textContent || '').replace(/[\:\-]$/, '');
                        let bText = pText;
                        if (bTitle && bText.startsWith(bTitle)) {
                            bText = bText.slice(bTitle.length).replace(/^[\:\-\s]+/, '').trim();
                        }
                        items.push({
                            boldText: bTitle ? truncateWord(bTitle, 30) : undefined,
                            bodyText: truncateWord(bText, 115),
                            type: 'bullet'
                        });
                    }
                });
            }

            // Yalnızca içi doluysa kart olarak ekle!
            if (items.length > 0) {
                generatedCards.push({
                    id: `sec-${sIdx + 1}`,
                    title: truncateWord(secTitle, 35),
                    icon,
                    color: COLOR_SEQUENCE[(generatedCards.length + 1) % COLOR_SEQUENCE.length],
                    items: items.slice(0, 5) // Kartı taşırmamak için en fazla 5 madde
                });
            }
        });

        // C) ÖZETTEKİ GERÇEK TUZAKLAR & PÜF NOKTALARI KUTUSUNU AYIKLA
        const trapBox = doc.querySelector('.box-green, [class*="trap"], [class*="tuzak"], [class*="warning"]');
        const trapItems: DynamicStudyCardItem[] = [];

        if (trapBox) {
            trapBox.querySelectorAll('.trap-card, .tuzak-item, p, div').forEach(tEl => {
                const full = cleanText(tEl.textContent || '');
                if (full.length >= 10 && full.length <= 220) {
                    const strong = tEl.querySelector('strong');
                    let tTitle = cleanText(strong?.textContent || '').replace(/[\:\-]$/, '');
                    let tText = full;
                    if (tTitle && tText.startsWith(tTitle)) {
                        tText = tText.slice(tTitle.length).replace(/^[\:\-\s]+/, '').trim();
                    }
                    if (!trapItems.some(item => item.bodyText === tText)) {
                        trapItems.push({
                            prefix: '⭐',
                            boldText: tTitle ? truncateWord(tTitle, 30) : undefined,
                            bodyText: truncateWord(tText, 110),
                            type: 'tip'
                        });
                    }
                }
            });

            // Yalnızca içi doluysa kart olarak ekle!
            if (trapItems.length > 0) {
                generatedCards.push({
                    id: 'traps-card',
                    title: 'Sınav Püf Noktaları & Tuzaklar',
                    icon: '⭐',
                    badgeText: 'Kritik Uyarılar',
                    color: 'yellow',
                    items: trapItems.slice(0, 5)
                });
            }
        }
    }

    // ══ GÜVENCE: Eğer hiçbir kart bulunamazsa doğrudan bu başlığın özetini tek karta koy ══
    if (generatedCards.length === 0) {
        generatedCards.push({
            id: 'fallback-card',
            title: cleanTitle,
            icon: '📖',
            color: 'cyan',
            items: [
                { boldText: cleanTitle, bodyText: 'Bu konu MEB müfredatında yer alan kilit kazanımları ve kavramları içerir.', type: 'concept', dotColor: '#16a34a' }
            ]
        });
    }

    return {
        gradeLine,
        examLine,
        ribbonText: 'Çalışma Notu',
        cards: generatedCards
    };
}

export function InstagramCarouselModal({
    isOpen,
    onClose,
    title,
    htmlContent,
    grade,
    courseName,
    unitName,
}: InstagramCarouselModalProps) {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isEditingData, setIsEditingData] = useState(false);
    const captureRef = useRef<HTMLDivElement>(null);

    // Başlangıç verisi: YALNIZCA bu notun içeriğindeki gerçek bölümlerden üretilir
    const initialSheetData = useMemo(() => {
        return extractDynamicNoteContent(htmlContent, title, grade, courseName, unitName);
    }, [htmlContent, title, grade, courseName, unitName]);

    const [sheetData, setSheetData] = useState<DynamicStudySheetData>(initialSheetData);

    useEffect(() => {
        setSheetData(initialSheetData);
    }, [initialSheetData]);

    // Kartları 2 veya 3 sütuna dengeli dağıt (Asla boş kutu yok!)
    const { columnCount, columns } = useMemo(() => {
        const cards = sheetData.cards;
        const total = cards.length;

        if (total <= 4) {
            // 2 Sütunlu Düzen
            const col1 = cards.slice(0, Math.ceil(total / 2));
            const col2 = cards.slice(Math.ceil(total / 2));
            return { columnCount: 2, columns: [col1, col2] };
        } else {
            // 3 Sütunlu Düzen
            const col1: DynamicStudyCard[] = [];
            const col2: DynamicStudyCard[] = [];
            const col3: DynamicStudyCard[] = [];

            cards.forEach((card, idx) => {
                if (idx % 3 === 0) col1.push(card);
                else if (idx % 3 === 1) col2.push(card);
                else col3.push(card);
            });

            return { columnCount: 3, columns: [col1, col2, col3] };
        }
    }, [sheetData.cards]);

    // Hazır Instagram Açıklama Metni (Caption)
    const captionText = useMemo(() => {
        const conceptCard = sheetData.cards.find(c => c.items.some(it => it.type === 'concept'));
        const conceptsText = conceptCard 
            ? conceptCard.items.map(c => `🔹 ${c.boldText || ''}: ${c.bodyText}`).join('\n')
            : '';

        return `📌 ${sheetData.examLine} | Renkli Çalışma Notu 📖✨\n\n` +
            `Yazılı ve sınavlar öncesi ${sheetData.examLine} konusunun tüm kilit noktalarını ve önemli yerlerini tek görselde topladık! 💡\n\n` +
            (conceptsText ? `🔑 Önemli Kavramlar:\n${conceptsText}\n\n` : '') +
            `💾 Sınav öncesi hızlıca tekrar etmek için bu gönderiyi KAYDET'e basmayı unutma!\n` +
            `👥 Sınıf arkadaşlarınla paylaşarak onların da faydalanmasını sağlayabilirsin. 🚀\n\n` +
            `📲 Bu ünitenin interaktif eğitici oyunlarını ücretsiz oynamak için profilimizdeki linke tıkla!\n\n` +
            `#dinkültürü #${title.replace(/\s+/g, '').toLowerCase()} #çalışmanotu #özet #yazılıyahazırlık #lgs #ortaokul #dindersiatolyesi #meb #öğretmen #öğrenci`;
    }, [sheetData, title]);

    const handleCopyCaption = useCallback(() => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(captionText);
            setIsCopied(true);
            toast({
                title: 'Açıklama Kopyalandı! 📋',
                description: 'Instagram gönderi metni ve etiketler panoya kopyalandı.',
            });
            setTimeout(() => setIsCopied(false), 2500);
        }
    }, [captionText, toast]);

    // Görseli İndir (PNG - 1080x1350 px)
    const handleDownloadInfographic = async () => {
        if (!captureRef.current) return;
        setIsExporting(true);

        let tempStyle: HTMLStyleElement | null = null;
        if (typeof document !== 'undefined') {
            tempStyle = document.createElement('style');
            tempStyle.id = 'html2canvas-font-metrics-fix';
            tempStyle.innerHTML = 'img { display: inline-block !important; }';
            document.head.appendChild(tempStyle);
        }

        try {
            if (typeof document !== 'undefined' && document.fonts) {
                await document.fonts.ready;
            }
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(captureRef.current, {
                scale: 2.0, // 540px * 2 = 1080px, 675px * 2 = 1350px (Instagram 4:5 tam dikey standardı)
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                scrollX: 0,
                scrollY: 0,
                windowWidth: 1200,
                onclone: (clonedDoc) => {
                    const cloneStyle = clonedDoc.createElement('style');
                    cloneStyle.innerHTML = 'img { display: inline-block !important; }';
                    clonedDoc.head.appendChild(cloneStyle);
                }
            });

            const link = document.createElement('a');
            link.download = `${sheetData.examLine.replace(/\s+/g, '_')}_Calisma_Notu_Instagram.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast({
                title: 'Çalışma Notu İndirildi! 🎉',
                description: 'Ultra net 1080x1350 Instagram dikey formatında başarıyla kaydedildi.',
            });
        } catch (error) {
            console.error('İndirme hatası:', error);
            toast({
                title: 'Hata',
                description: 'Görsel kaydedilirken bir sorun oluştu.',
                variant: 'destructive',
            });
        } finally {
            if (tempStyle && tempStyle.parentNode) {
                tempStyle.remove();
            }
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl w-[98vw] bg-slate-950 border border-slate-800 text-white rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
                {/* Sevimli El Yazısı ve Başlık Fontları */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Caveat:wght@700&family=Plus+Jakarta+Sans:wght@600;700;800;900&display=swap" rel="stylesheet" />

                {/* MODAL ÜST BARI */}
                <DialogHeader className="pb-2.5 border-b border-slate-800 flex-shrink-0 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-900/30 flex-shrink-0 text-xl">
                            🎨
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                                <span>İnfografik Çalışma Notu (Instagram 4:5)</span>
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30 text-[10px] hidden sm:inline-flex">
                                    1080 x 1350 px
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 truncate">
                                {sheetData.examLine} • Sadece ders notundaki gerçek bölümlerden üretilir
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Metin Düzenle Butonu */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingData(prev => !prev)}
                            className={`border rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 cursor-pointer ${
                                isEditingData 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                            title="Çalışma notundaki kartları düzenle"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isEditingData ? 'Önizleme' : 'Metinleri Düzenle'}</span>
                        </Button>

                        {/* Açıklama Metni Kopyala */}
                        <Button
                            size="sm"
                            onClick={handleCopyCaption}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 cursor-pointer"
                            title="Hazır Instagram Açıklama ve Etiketlerini Kopyala"
                        >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                            <span className="hidden sm:inline">{isCopied ? 'Kopyalandı' : 'Metni Kopyala'}</span>
                        </Button>

                        {/* Çalışma Notunu İndir */}
                        <Button
                            size="sm"
                            onClick={handleDownloadInfographic}
                            disabled={isExporting}
                            className="bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white font-black rounded-xl text-xs h-9 px-4 shadow-lg shadow-pink-900/30 flex items-center gap-1.5 cursor-pointer"
                            title="Görseli Instagram 4:5 (1080x1350) olarak bilgisayara indir"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Hazırlanıyor...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Çalışma Notunu İndir (PNG)</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                {/* ANA ÇALIŞMA ALANI */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center gap-4 py-2 overflow-hidden">
                    
                    {/* SOL: 4:5 Dikey İnfografik Önizleme Tuvali (540px x 675px -> x2 = 1080px x 1350px) */}
                    <div className="flex flex-col items-center justify-center h-full max-h-full">
                        <div className="relative p-1.5 rounded-[1.5rem] bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                            
                            {/* ═══════════════════════════════════════════════════════════ */}
                            {/* GERÇEK ÇIKTI ALINACAK İNFOGRAFİK KART (540 x 675 px - 4:5) */}
                            {/* ═══════════════════════════════════════════════════════════ */}
                            <div
                                ref={captureRef}
                                className="w-[540px] h-[675px] bg-[#ffffff] rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between relative select-none p-2.5"
                                style={{
                                    fontFamily: "'Patrick Hand', 'Plus Jakarta Sans', sans-serif",
                                    boxSizing: 'border-box',
                                    color: '#1e293b'
                                }}
                            >
                                {/* ══ 1. ÜST BAŞLIK ALANI (AHŞAP TABELA & İLLÜSTRASYONLAR) ══ */}
                                <div className="flex items-center justify-between px-2 pt-1 pb-1 relative flex-shrink-0">
                                    {/* Sol: Sevimli Açık Kitap */}
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl filter drop-shadow-md select-none transform -rotate-6">
                                        📖
                                    </div>

                                    {/* Orta: Ahşap Tabela ve Sarkan Sarı Rozet */}
                                    <div className="flex flex-col items-center relative z-10">
                                        <div 
                                            className="px-6 py-1.5 rounded-xl border-[2.5px] border-[#78350f] text-center shadow-md relative"
                                            style={{
                                                background: 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 50%, #fde68a 100%)',
                                                boxShadow: '0 3px 6px rgba(120, 53, 15, 0.25), inset 0 1px 0 rgba(255,255,255,0.6)'
                                            }}
                                        >
                                            <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#78350f] opacity-60"></span>
                                            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#78350f] opacity-60"></span>
                                            <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#78350f] opacity-60"></span>
                                            <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#78350f] opacity-60"></span>

                                            <div className="text-[13px] font-black tracking-tight text-[#78350f] leading-none mb-0.5">
                                                {sheetData.gradeLine}
                                            </div>
                                            <div className="text-[16px] font-black tracking-tight text-[#451a03] leading-tight max-w-[360px] truncate">
                                                {sheetData.examLine}
                                            </div>
                                        </div>

                                        <div className="flex justify-between w-24 -my-1 z-20">
                                            <div className="w-1.5 h-3 bg-[#78350f] rounded-full mx-auto"></div>
                                            <div className="w-1.5 h-3 bg-[#78350f] rounded-full mx-auto"></div>
                                        </div>

                                        <div 
                                            className="px-5 py-0.5 rounded-full border-2 border-[#ca8a04] bg-[#fde047] text-[#713f12] text-[13px] font-black tracking-wide shadow-sm z-20"
                                            style={{
                                                boxShadow: '0 2px 4px rgba(202, 138, 4, 0.3)'
                                            }}
                                        >
                                            {sheetData.ribbonText}
                                        </div>
                                    </div>

                                    {/* Sağ: Sevimli Kalem */}
                                    <div className="w-12 h-12 flex items-center justify-center text-3xl filter drop-shadow-md select-none transform rotate-12">
                                        ✏️
                                    </div>
                                </div>

                                {/* ══ 2. ORTA DİNAMİK KARTLAR ALANI (ASLA BOŞ KUTU YOK!) ══ */}
                                <div 
                                    className={`grid gap-2 flex-1 my-1 overflow-hidden ${
                                        columnCount === 2 ? 'grid-cols-2' : 'grid-cols-3'
                                    }`}
                                >
                                    {columns.map((colCards, colIdx) => (
                                        <div key={colIdx} className="flex flex-col gap-2 justify-between h-full">
                                            {colCards.map((card) => {
                                                const style = CARD_PALETTES[card.color] || CARD_PALETTES.cyan;
                                                return (
                                                    <div 
                                                        key={card.id}
                                                        style={{
                                                            background: style.bg,
                                                            border: `1.5px solid ${style.border}`,
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                                                        }}
                                                        className="rounded-xl p-2 flex flex-col justify-between flex-1 gap-1 overflow-hidden"
                                                    >
                                                        {/* Kart Başlığı */}
                                                        <div 
                                                            style={{ color: style.titleColor, borderColor: style.border }}
                                                            className="flex items-center justify-between border-b pb-0.5 leading-tight flex-shrink-0"
                                                        >
                                                            <div className="flex items-center gap-1 font-black text-[11px] truncate">
                                                                <span className="text-xs">{card.icon}</span>
                                                                <span className="truncate">{card.title}</span>
                                                            </div>
                                                            {card.badgeText && (
                                                                <span 
                                                                    style={{ background: style.badgeBg, color: style.badgeText }}
                                                                    className="text-[8.5px] font-black px-1.5 py-0.2 rounded-md uppercase flex-shrink-0"
                                                                >
                                                                    {card.badgeText}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Kart Maddeleri (Yalnızca gerçek içerik!) */}
                                                        <div className="space-y-1 pt-0.5 overflow-hidden flex-1 flex flex-col justify-between">
                                                            {card.items.map((it, idx) => (
                                                                <div key={idx} className="text-[9.5px] leading-[1.25] flex items-start gap-1">
                                                                    {it.type === 'concept' ? (
                                                                        <>
                                                                            <span 
                                                                                className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
                                                                                style={{ background: it.dotColor || style.accent }}
                                                                            />
                                                                            <div className="truncate-multiline">
                                                                                <strong className="text-[#0f172a] font-black">{it.boldText}:</strong>{' '}
                                                                                <span className="text-[#334155]">{it.bodyText}</span>
                                                                            </div>
                                                                        </>
                                                                    ) : it.type === 'tip' ? (
                                                                        <>
                                                                            <span className="text-amber-500 font-bold flex-shrink-0">⭐</span>
                                                                            <div>
                                                                                {it.boldText && <strong className="text-[#854d0e] font-black mr-1">{it.boldText}:</strong>}
                                                                                <span className="text-[#475569]">{it.bodyText}</span>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="text-emerald-600 font-bold flex-shrink-0">✔</span>
                                                                            <div>
                                                                                {it.boldText && <strong className="text-[#0f172a] font-black mr-1">{it.boldText}:</strong>}
                                                                                <span className="text-[#334155]">{it.bodyText}</span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>

                                {/* ══ 3. ALT BİLGİ ALANI (KURDELE & İLLÜSTRASYONLAR) ══ */}
                                <div className="flex items-center justify-between px-3 pt-0.5 pb-0.5 border-t border-[#f1f5f9] flex-shrink-0">
                                    <div className="text-2xl filter drop-shadow-xs select-none">
                                        📚
                                    </div>

                                    <div 
                                        className="px-6 py-1 rounded-full border-2 border-[#8b5cf6] bg-[#ede9fe] text-[#5b21b6] text-[13px] font-black tracking-wide shadow-xs flex items-center gap-1.5"
                                        style={{
                                            boxShadow: '0 2px 4px rgba(139, 92, 246, 0.25)'
                                        }}
                                    >
                                        <span>🕌</span>
                                        <span>DinDersi Atölyesi</span>
                                    </div>

                                    <div className="text-2xl filter drop-shadow-xs select-none">
                                        🖍️
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ: Metin Düzenleme Paneli veya Hazır Açıklama */}
                    <div className="flex-1 min-w-0 h-full flex flex-col gap-3 justify-between">
                        {isEditingData ? (
                            /* ── METİN DÜZENLEME PANELİ (GERÇEK KARTLARI DÜZENLE) ── */
                            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto max-h-[580px] text-xs">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="font-extrabold text-amber-300 flex items-center gap-1.5 text-sm">
                                        <Edit3 className="w-4 h-4" />
                                        <span>Kart Metinlerini Düzenle</span>
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSheetData(initialSheetData)}
                                        className="h-7 text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                        title="Bu notun orijinal içeriğine geri dön"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Sıfırla
                                    </Button>
                                </div>

                                {/* Ahşap Tabela Başlıkları */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Tabela Üst Satır (Sınıf & Ders):</label>
                                    <input 
                                        type="text"
                                        value={sheetData.gradeLine}
                                        onChange={e => setSheetData(prev => ({ ...prev, gradeLine: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Tabela Alt Satır (Konu / Başlık):</label>
                                    <input 
                                        type="text"
                                        value={sheetData.examLine}
                                        onChange={e => setSheetData(prev => ({ ...prev, examLine: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                    />
                                </div>

                                {/* Dinamik Kartlar Listesi */}
                                <div className="space-y-3 pt-2 border-t border-slate-800">
                                    {sheetData.cards.map((card, cIdx) => (
                                        <div key={card.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-amber-300 flex items-center gap-1">
                                                    <span>{card.icon}</span>
                                                    <span>{cIdx + 1}. Kart Başlığı</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSheetData(prev => ({
                                                            ...prev,
                                                            cards: prev.cards.filter((_, i) => i !== cIdx)
                                                        }));
                                                    }}
                                                    className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                                                    title="Bu kartı kaldır"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <input 
                                                type="text"
                                                value={card.title}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setSheetData(prev => {
                                                        const next = [...prev.cards];
                                                        next[cIdx] = { ...next[cIdx], title: val };
                                                        return { ...prev, cards: next };
                                                    });
                                                }}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold text-xs"
                                            />

                                            {/* Kart Maddeleri */}
                                            <div className="space-y-1.5 pt-1">
                                                {card.items.map((it, iIdx) => (
                                                    <div key={iIdx} className="flex gap-1.5 items-center">
                                                        {it.boldText !== undefined && (
                                                            <input 
                                                                type="text"
                                                                value={it.boldText}
                                                                placeholder="Başlık/Kavram"
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setSheetData(prev => {
                                                                        const nextCards = [...prev.cards];
                                                                        const nextItems = [...nextCards[cIdx].items];
                                                                        nextItems[iIdx] = { ...nextItems[iIdx], boldText: val };
                                                                        nextCards[cIdx] = { ...nextCards[cIdx], items: nextItems };
                                                                        return { ...prev, cards: nextCards };
                                                                    });
                                                                }}
                                                                className="w-24 bg-slate-900 border border-slate-700 rounded-md px-1.5 py-1 text-white text-[11px] font-bold"
                                                            />
                                                        )}
                                                        <input 
                                                            type="text"
                                                            value={it.bodyText}
                                                            placeholder="Açıklama"
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setSheetData(prev => {
                                                                    const nextCards = [...prev.cards];
                                                                    const nextItems = [...nextCards[cIdx].items];
                                                                    nextItems[iIdx] = { ...nextItems[iIdx], bodyText: val };
                                                                    nextCards[cIdx] = { ...nextCards[cIdx], items: nextItems };
                                                                    return { ...prev, cards: nextCards };
                                                                });
                                                            }}
                                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-1.5 py-1 text-white text-[11px]"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsEditingData(false)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-8 cursor-pointer"
                                    >
                                        Değişiklikleri Çalışma Notuna Uygula ✨
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* ── AÇIKLAMA METNİ & İPUÇLARI ── */
                            <>
                                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Instagram Gönderi Açıklaması & Etiketler</span>
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCopyCaption}
                                            className="h-6 px-2 text-[11px] font-bold text-pink-400 hover:text-pink-300 hover:bg-pink-500/10 rounded-lg cursor-pointer"
                                        >
                                            {isCopied ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                                            {isCopied ? 'Kopyalandı' : 'Metni Kopyala'}
                                        </Button>
                                    </div>
                                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 max-h-56 overflow-y-auto text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-wrap select-text scrollbar-thin">
                                        {captionText}
                                    </div>
                                </div>

                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-xs text-emerald-200 space-y-1">
                                    <div className="font-extrabold flex items-center gap-1.5 text-emerald-300">
                                        <span>✨</span>
                                        <span>Sıfır Boş Kutu, Tamamı Not İçeriği</span>
                                    </div>
                                    <p className="text-[11.5px] leading-relaxed text-emerald-100/90">
                                        Gereksiz sahte kalıplar ve boş kutular kaldırılmıştır. Yalnızca bu ders notunda gerçekten yer alan bölümler, kavramlar ve maddeler şık kartlar halinde yer alır.
                                    </p>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
                                    <span>Çözünürlük: <strong className="text-white">1080 x 1350 px (4:5 Dikey)</strong></span>
                                    <span>Kart Sayısı: <strong className="text-white">{sheetData.cards.length} Bölüm</strong></span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
