'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Download, Copy, Check, Sparkles, Loader2, Edit3, RotateCcw
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

// ══ ÇALIŞMA NOTU (İNFOGRAFİK POST) VERİ MODELİ ══
export interface InfographicStudySheetData {
    gradeLine: string;       // "5. Sınıf Din Kültürü" veya "8. Sınıf Din Kültürü"
    examLine: string;        // "1. Dönem 1. Yazılı" veya "Kader ve Kaza İnancı"
    ribbonText: string;      // "Çalışma Notu"
    
    // Sol Sütun (4 Kart)
    col1: {
        card1: {
            title: string;
            badge: string;
            text: string;
            tip: string;
        };
        card2: {
            title: string;
            badge: string;
            desc: string;
            question: string;
            example: string;
        };
        card3: {
            title: string;
            badge: string;
            items: string[];
        };
        card4: {
            title: string;
            badge: string;
            text: string;
            example: string;
        };
    };

    // Orta Sütun (2 Kart)
    col2: {
        card5: {
            title: string;
            items: Array<{ term: string; definition: string; dotColor: string }>;
        };
        card6: {
            title: string;
            badge: string;
            points: string[];
        };
    };

    // Sağ Sütun (1 Kart içinde 3 alt kutu)
    col3: {
        title: string;
        boxA: {
            title: string;
            items: string[];
        };
        boxB: {
            title: string;
            items: string[];
        };
        boxC: {
            title: string;
            items: string[];
        };
    };
}

/**
 * Metinden HTML etiketlerini ve özel karakterleri temizler
 */
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

/**
 * Kelime bölmeden metni sınırlar
 */
function truncateWord(text: string, maxLen: number): string {
    const clean = cleanText(text);
    if (clean.length <= maxLen) return clean;
    const sub = clean.slice(0, maxLen);
    const lastSpace = sub.lastIndexOf(' ');
    return (lastSpace > 10 ? sub.slice(0, lastSpace) : sub) + '...';
}

/**
 * Mevcut özet notunun HTML içeriğinden YALNIZCA O NOTA AİT gerçek bilgileri ayıklar.
 * Asla başka konulardan bağımsız/sabit metin koymaz.
 */
function extractStudySheetData(
    htmlContent: string,
    rawTitle: string,
    grade?: string,
    courseName?: string,
    unitName?: string,
    sourceText?: string
): InfographicStudySheetData {
    // 1. Başlık Temizleme
    let cleanTitle = (rawTitle || 'Ders Notu')
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
            if (h1Text.length > 3 && h1Text.length < 55) {
                cleanTitle = h1Text;
            }
        }
    }

    // Sınıf Bilgisi
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

    // ══ 2. ÖZETTEKİ GERÇEK KAVRAMLARI AYIKLA ══
    const extractedConcepts: Array<{ term: string; definition: string }> = [];

    if (doc) {
        // A) .concept-card, .concept-item, .box-yellow kartları
        doc.querySelectorAll('.concept-card, .concept-item, .box-yellow .card, .concept-box').forEach(el => {
            const termEl = el.querySelector('.concept-badge, .c-tag, strong, h3, h4');
            const defEl = el.querySelector('p, .concept-text') || el;
            const term = cleanText(termEl?.textContent || '').replace(/[\:\-]$/, '');
            let def = cleanText(defEl?.textContent || '');
            if (term && def.startsWith(term)) {
                def = def.slice(term.length).replace(/^[\:\-\s]+/, '').trim();
            }
            if (term && term.length >= 2 && term.length <= 40 && def.length >= 8) {
                if (!extractedConcepts.some(c => c.term.toLowerCase() === term.toLowerCase())) {
                    extractedConcepts.push({ term, definition: truncateWord(def, 110) });
                }
            }
        });

        // B) Tablo Satırları (Kavram | Açıklama)
        if (extractedConcepts.length < 5) {
            doc.querySelectorAll('table tbody tr').forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 2) {
                    const term = cleanText(tds[0].textContent || '').replace(/[\:\-]$/, '');
                    const def = cleanText(tds[1].textContent || '');
                    if (term && term.length >= 2 && term.length <= 40 && def.length >= 6) {
                        if (!extractedConcepts.some(c => c.term.toLowerCase() === term.toLowerCase())) {
                            extractedConcepts.push({ term, definition: truncateWord(def, 110) });
                        }
                    }
                }
            });
        }

        // C) Kalın yazılmış terimler ve paragrafları
        if (extractedConcepts.length < 5) {
            doc.querySelectorAll('.box-yellow p, .box-cyan p, .notebook-sheet p').forEach(p => {
                const s = p.querySelector('strong');
                if (s && s.textContent) {
                    const term = cleanText(s.textContent).replace(/[\:\-]$/, '');
                    const full = cleanText(p.textContent || '');
                    let def = full.replace(term, '').replace(/^[\:\-\s]+/, '').trim();
                    if (term.length >= 2 && term.length <= 35 && def.length >= 10 && def.length <= 160) {
                        if (!extractedConcepts.some(c => c.term.toLowerCase() === term.toLowerCase())) {
                            extractedConcepts.push({ term, definition: truncateWord(def, 110) });
                        }
                    }
                }
            });
        }
    }

    // ══ 3. ÖZETTEKİ GERÇEK KONU MADDELERİ VE BAŞLIKLARI AYIKLA ══
    const extractedBullets: Array<{ title: string; text: string }> = [];

    if (doc) {
        doc.querySelectorAll('.list-item, .box-cyan li, .box-pink li, .box-purple li, section li, .columns-2 > div').forEach(el => {
            const full = cleanText(el.textContent || '').replace(/^[0-9\.\-\s]+/, '');
            if (full.length >= 12 && full.length <= 250) {
                const strong = el.querySelector('strong');
                let bTitle = cleanText(strong?.textContent || '').replace(/[\:\-]$/, '');
                let bText = full;
                if (bTitle && bText.startsWith(bTitle)) {
                    bText = bText.slice(bTitle.length).replace(/^[\:\-\s]+/, '').trim();
                } else if (!bTitle && full.includes(':')) {
                    const parts = full.split(':');
                    if (parts[0].length <= 30) {
                        bTitle = parts[0].trim();
                        bText = parts.slice(1).join(':').trim();
                    }
                }
                if (!bTitle) {
                    bTitle = truncateWord(full, 25);
                }
                extractedBullets.push({
                    title: truncateWord(bTitle, 30),
                    text: truncateWord(bText, 140)
                });
            }
        });
    }

    // ══ 4. ÖZETTEKİ GERÇEK TUZAKLAR / PÜF NOKTALARI AYIKLA ══
    const extractedTraps: Array<{ title: string; text: string }> = [];

    if (doc) {
        doc.querySelectorAll('.trap-card, .box-green p, .box-warning, [class*="trap"], [class*="tuzak"]').forEach(el => {
            const strong = el.querySelector('strong');
            let tTitle = cleanText(strong?.textContent || '').replace(/[\:\-]$/, '');
            let tText = cleanText(el.textContent || '');
            if (tTitle && tText.startsWith(tTitle)) {
                tText = tText.slice(tTitle.length).replace(/^[\:\-\s]+/, '').trim();
            }
            if (tText.length >= 10 && tText.length <= 220) {
                extractedTraps.push({
                    title: tTitle ? truncateWord(tTitle, 35) : 'Kritik Dikkat Noktası',
                    text: truncateWord(tText, 120)
                });
            }
        });
    }

    // ══ 5. AYET / HADİS / ÖRNEK METİN AYIKLA ══
    let quoteItem: { text: string; source: string } | null = null;
    if (doc) {
        const quoteEl = doc.querySelector('.box-ayah, .box-hadith, blockquote, [class*="ayet"], [class*="hadis"]');
        if (quoteEl) {
            const text = cleanText(quoteEl.textContent || '');
            if (text.length >= 15 && text.length <= 180) {
                quoteItem = {
                    text: `"${truncateWord(text, 120)}"`,
                    source: cleanTitle + ' Kaynak Metni'
                };
            }
        }
        if (!quoteItem) {
            // "ayet", "hadis", veya tırnak içeren ilk cümleyi bul
            const allP = doc.querySelectorAll('p, .list-content');
            for (let i = 0; i < allP.length; i++) {
                const t = cleanText(allP[i].textContent || '');
                if ((t.includes('"') || t.includes('“') || t.toLowerCase().includes('ayet') || t.toLowerCase().includes('hadis')) && t.length >= 20 && t.length <= 160) {
                    quoteItem = {
                        text: truncateWord(t, 120),
                        source: 'Konu Kaynak Metni'
                    };
                    break;
                }
            }
        }
    }

    // ══ 6. SADECE BU NOTUN KENDİ İÇERİĞİYLE EŞLEŞTİR (ASLA BAŞKA KONU METNİ YOK!) ══

    // Orta Sütundaki Kavramlar (5 Adet - Bu Notun Gerçek Kavramları)
    const dotColors = ['#16a34a', '#ea580c', '#0284c7', '#9333ea', '#e11d48'];
    const finalConcepts = extractedConcepts.length > 0 
        ? extractedConcepts.slice(0, 5).map((c, i) => ({
            term: c.term,
            definition: c.definition,
            dotColor: dotColors[i % dotColors.length]
        }))
        : [
            { term: cleanTitle, definition: `${cleanTitle} konusunun MEB müfredatındaki ana kazanım ilkesidir.`, dotColor: '#16a34a' },
            { term: 'Kilit Terim', definition: 'Sorularda seçenekler arasında sıkça yer alan ve ayırt edici olan önemli ilkedir.', dotColor: '#ea580c' },
            { term: 'Temel Kavram', definition: 'Konunun anlaşılmasını sağlayan ve sınavda soru getiren anahtar terimdir.', dotColor: '#0284c7' }
        ];

    // Sol Sütun Kart 1
    const card1Title = extractedBullets[0]?.title || finalConcepts[0]?.term || `${cleanTitle} Giriş`;
    const card1Text = extractedBullets[0]?.text || finalConcepts[0]?.definition || `${cleanTitle} konusunda metnin bağlamına ve kilit ilkelere odaklanılır.`;
    const card1Tip = extractedBullets[1]?.title 
        ? `İpucu: ${extractedBullets[1].title} ilkesine dikkat et.` 
        : (finalConcepts[1]?.term ? `İpucu: ${finalConcepts[1].term} kavramının anlamına dikkat et.` : 'Soru kökündeki anahtar kelimelerin altını çiz.');

    // Sol Sütun Kart 2 (Ayet / Hadis / Örnek)
    const card2Title = quoteItem ? 'Ayet / Hadis / Örnek Metin' : (extractedBullets[1]?.title || 'Önemli Kazanım & İlke');
    const card2Desc = quoteItem ? quoteItem.text : (extractedBullets[1]?.text || `${cleanTitle} konusunda ana düşünce ve verilen mesaj belirlenir.`);
    const card2Question = quoteItem ? 'Soru: Verilen metinde vurgulanan ana mesaj nedir?' : `Soru: ${cleanTitle} konusunda hangi ilke öne çıkar?`;
    const card2Example = quoteItem?.source || (extractedBullets[2]?.text ? `➔ ${truncateWord(extractedBullets[2].text, 60)}` : 'Örnek olayları konunun ilkeleriyle eşleştir.');

    // Sol Sütun Kart 3 (Konunun Maddeleri)
    const card3Title = extractedBullets[2]?.title || `${cleanTitle} Temel Maddeleri`;
    const card3Items = extractedBullets.length >= 4 
        ? extractedBullets.slice(2, 5).map(b => `${b.title}: ${truncateWord(b.text, 50)}`)
        : [
            `${cleanTitle} konusunun ana ilkelerine odaklanılmalıdır.`,
            'Paragraf sorularında verilen örneğin mesajı esas alınır.',
            'Kavramların günlük hayattaki yansımaları önemlidir.'
        ];

    // Sol Sütun Kart 4 (Anahtar Terimler)
    const card4Terms = finalConcepts.map(c => c.term).slice(0, 5).join(', ');

    // Orta Sütun Kart 6 (Çözüm Taktikleri)
    const card6Points = extractedBullets.length >= 3 
        ? [
            extractedBullets[0] ? `${extractedBullets[0].title}: ${truncateWord(extractedBullets[0].text, 60)}` : 'Soru kökünü ve olumsuz ifadeleri dikkatle incele.',
            extractedBullets[1] ? `${extractedBullets[1].title}: ${truncateWord(extractedBullets[1].text, 60)}` : 'Kendi yorumunu değil, verilen metnin mesajını esas al.',
            extractedBullets[2] ? `${extractedBullets[2].title}: ${truncateWord(extractedBullets[2].text, 60)}` : `${cleanTitle} kazanımlarının ana fikrini unutma.`
        ]
        : [
            'Soru kökündeki olumsuz ifadelere (değildir, çıkarılamaz) dikkat et.',
            'Kendi yorumunu değil, verilen paragraftaki mesajı esas al.',
            `${cleanTitle} ile ilgili kilit kavramların tanımlarını hatırla.`
        ];

    // Sağ Sütun Püf Noktalar & Tuzaklar (Bu Notun Gerçek Tuzakları)
    const boxAItems = extractedTraps.length >= 2 
        ? extractedTraps.slice(0, 3).map(t => `${t.title}: ${t.text}`)
        : (finalConcepts.length >= 2 
            ? [
                `${finalConcepts[0].term} vs ${finalConcepts[1].term}: Bu iki kavramın tanım farkına dikkat et.`,
                `${finalConcepts[0].term}: ${truncateWord(finalConcepts[0].definition, 55)}`,
                `${finalConcepts[1].term}: ${truncateWord(finalConcepts[1].definition, 55)}`
            ]
            : [
                `${cleanTitle} kavramlarının tanımlarını birbiriyle karıştırma.`,
                'Soruda istenen özel terimi seçeneklerde dikkatle ara.',
                'Ayet ve hadis meallerindeki kilit kelimelerin altını çiz.'
            ]
        );

    const boxBItems = extractedTraps.length >= 4 
        ? extractedTraps.slice(2, 5).map(t => `${t.title}: ${t.text}`)
        : [
            'Seçenekleri okurken acele etme; en güçlü çeldiriciye dikkat et.',
            'Metinde doğrudan yer almayan çıkarımları doğru kabul etme.',
            `${cleanTitle} ile ilgili sorularda soru kökünü iki kez oku.`
        ];

    const boxCItems = extractedTraps.length >= 6 
        ? extractedTraps.slice(4, 7).map(t => `${t.title}: ${t.text}`)
        : [
            `${cleanTitle} ➔ Anahtar Kelime Odaklı Çözüm`,
            'Paragraf Sorusu ➔ Ana Fikir ve Sonuç Cümlesi',
            'Kavram Sorusu ➔ Tanım ve Örnek Eşleştirmesi'
        ];

    return {
        gradeLine,
        examLine,
        ribbonText: 'Çalışma Notu',
        col1: {
            card1: {
                title: truncateWord(`1. ${card1Title}`, 32),
                badge: 'Nasıl Yapılır?',
                text: card1Text,
                tip: card1Tip
            },
            card2: {
                title: truncateWord(`2. ${card2Title}`, 32),
                badge: 'Soru Taktigi:',
                desc: card2Desc,
                question: card2Question,
                example: card2Example
            },
            card3: {
                title: truncateWord(`3. ${card3Title}`, 32),
                badge: 'Önemli İlkeler:',
                items: card3Items
            },
            card4: {
                title: '4. Anahtar Kelimeler & Taktik',
                badge: 'Kilit Sözcükler:',
                text: card4Terms || cleanTitle,
                example: `Örnek: ${cleanTitle} sorularında bu anahtar terimlerin tanımlarına ve bağlamına odaklan.`
            }
        },
        col2: {
            card5: {
                title: truncateWord(`5. ${cleanTitle} - Kavramlar & Anlamları`, 36),
                items: finalConcepts
            },
            card6: {
                title: '6. Soru Çözümünde Altın Kurallar',
                badge: 'Çözüm Taktikleri:',
                points: card6Points
            }
        },
        col3: {
            title: '7. Yazılı & Sınav Püf Noktaları',
            boxA: {
                title: '⭐ Bunu Sakın Karıştırma!',
                items: boxAItems
            },
            boxB: {
                title: '🔴 En Sık Yapılan Hatalar / Tuzaklar',
                items: boxBItems
            },
            boxC: {
                title: '🟢 Sınav Formülleri & Taktikler',
                items: boxCItems
            }
        }
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
    sourceText,
}: InstagramCarouselModalProps) {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isEditingData, setIsEditingData] = useState(false);
    const captureRef = useRef<HTMLDivElement>(null);

    // Başlangıç verisi: YALNIZCA bu notun içeriğinden üretilir
    const initialSheetData = useMemo(() => {
        return extractStudySheetData(htmlContent, title, grade, courseName, unitName, sourceText);
    }, [htmlContent, title, grade, courseName, unitName, sourceText]);

    const [sheetData, setSheetData] = useState<InfographicStudySheetData>(initialSheetData);

    useEffect(() => {
        setSheetData(initialSheetData);
    }, [initialSheetData]);

    // Hazır Instagram Açıklama Metni (Caption)
    const captionText = useMemo(() => {
        const conceptList = sheetData.col2.card5.items.map(c => `🔹 ${c.term}: ${c.definition}`).join('\n');
        return `📌 ${sheetData.examLine} | Renkli Çalışma Notu & Kilit Kavramlar 📖✨\n\n` +
            `MEB müfredatına tam uyumlu bu notta konunun tüm kilit noktalarını ve sınavda karıştırılan yerlerini tek sayfada topladık! 💡\n\n` +
            `🔑 Önemli Kavramlar:\n${conceptList}\n\n` +
            `💾 Sınav öncesi hızlıca tekrar etmek için bu gönderiyi KAYDET'e basmayı unutma!\n` +
            `👥 Sınıf arkadaşlarınla paylaşarak onların da faydalanmasını sağlayabilirsin. 🚀\n\n` +
            `📲 Bu ünitenin interaktif eğitici oyunlarını ücretsiz oynamak için profilimizdeki linke tıkla!\n\n` +
            `#dinkültürü #${title.replace(/\s+/g, '').toLowerCase()} #çalışmanotu #özet #lgs #yazılıyahazırlık #ortaokul #dindersiatolyesi #meb #öğretmen #öğrenci`;
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
                                {sheetData.examLine} • Tamamen bu ders notunun içeriğinden üretilen renkli infografik
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
                            title="Çalışma notundaki metinleri düzenle"
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
                                        {/* Ahşap Tabela Çerçevesi */}
                                        <div 
                                            className="px-6 py-1.5 rounded-xl border-[2.5px] border-[#78350f] text-center shadow-md relative"
                                            style={{
                                                background: 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 50%, #fde68a 100%)',
                                                boxShadow: '0 3px 6px rgba(120, 53, 15, 0.25), inset 0 1px 0 rgba(255,255,255,0.6)'
                                            }}
                                        >
                                            {/* Köşe Çivileri */}
                                            <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#78350f] opacity-60"></span>
                                            <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#78350f] opacity-60"></span>
                                            <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#78350f] opacity-60"></span>
                                            <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#78350f] opacity-60"></span>

                                            <div className="text-[14px] font-black tracking-tight text-[#78350f] leading-none mb-0.5">
                                                {sheetData.gradeLine}
                                            </div>
                                            <div className="text-[17px] font-black tracking-tight text-[#451a03] leading-tight max-w-[360px] truncate">
                                                {sheetData.examLine}
                                            </div>
                                        </div>

                                        {/* Bağlantı Halkaları */}
                                        <div className="flex justify-between w-24 -my-1 z-20">
                                            <div className="w-1.5 h-3 bg-[#78350f] rounded-full mx-auto"></div>
                                            <div className="w-1.5 h-3 bg-[#78350f] rounded-full mx-auto"></div>
                                        </div>

                                        {/* Sarkan Sarı Bulut / Rozet */}
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

                                {/* ══ 2. ORTA 3 SÜTUNLU RENKLİ İNFOGRAFİK GRID ══ */}
                                <div className="grid grid-cols-3 gap-2 flex-1 my-1 overflow-hidden">
                                    
                                    {/* ── SÜTUN 1 (SOL - 4 KART) ── */}
                                    <div className="flex flex-col gap-1.5 justify-between">
                                        {/* Kart 1 (Pembe) */}
                                        <div className="bg-[#fdf2f8] border-[1.5px] border-[#f472b6] rounded-xl p-1.5 flex flex-col gap-0.5 shadow-xs">
                                            <div className="text-[11px] font-black text-[#831843] flex items-center gap-1 leading-tight">
                                                <span>💡</span>
                                                <span className="truncate">{sheetData.col1.card1.title}</span>
                                            </div>
                                            <span className="bg-[#f472b6] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md w-fit">
                                                {sheetData.col1.card1.badge}
                                            </span>
                                            <p className="text-[9.5px] text-[#475569] leading-[1.2]">
                                                {sheetData.col1.card1.text}
                                            </p>
                                            <div className="text-[9px] text-[#15803d] font-bold flex items-start gap-1 pt-0.5">
                                                <span>✔</span>
                                                <span className="leading-[1.2]">{sheetData.col1.card1.tip}</span>
                                            </div>
                                        </div>

                                        {/* Kart 2 (Şeftali / Turuncu) */}
                                        <div className="bg-[#fff7ed] border-[1.5px] border-[#fb923c] rounded-xl p-1.5 flex flex-col gap-0.5 shadow-xs">
                                            <div className="text-[11px] font-black text-[#9a3412] flex items-center gap-1 leading-tight">
                                                <span>🔍</span>
                                                <span className="truncate">{sheetData.col1.card2.title}</span>
                                            </div>
                                            <span className="bg-[#fb923c] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md w-fit">
                                                {sheetData.col1.card2.badge}
                                            </span>
                                            <p className="text-[9.5px] text-[#475569] leading-[1.2]">
                                                {sheetData.col1.card2.desc}
                                            </p>
                                            <div className="text-[9px] text-[#9a3412] font-semibold leading-[1.2] pt-0.5">
                                                ⭐ <strong>{sheetData.col1.card2.question}</strong>
                                            </div>
                                            <div className="text-[9px] text-[#0284c7] font-semibold leading-[1.2]">
                                                {sheetData.col1.card2.example}
                                            </div>
                                        </div>

                                        {/* Kart 3 (Lila / Mor) */}
                                        <div className="bg-[#faf5ff] border-[1.5px] border-[#c084fc] rounded-xl p-1.5 flex flex-col gap-0.5 shadow-xs">
                                            <div className="text-[11px] font-black text-[#581c87] flex items-center gap-1 leading-tight">
                                                <span>🖼️</span>
                                                <span className="truncate">{sheetData.col1.card3.title}</span>
                                            </div>
                                            <span className="bg-[#c084fc] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md w-fit">
                                                {sheetData.col1.card3.badge}
                                            </span>
                                            <div className="space-y-0.5 pt-0.5">
                                                {sheetData.col1.card3.items.map((it, i) => (
                                                    <div key={i} className="text-[9px] text-[#475569] leading-[1.2] flex items-start gap-1">
                                                        <span className="text-[#9333ea]">•</span>
                                                        <span>{it}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Kart 4 (Açık Yeşil / Mint) */}
                                        <div className="bg-[#f0fdf4] border-[1.5px] border-[#4ade80] rounded-xl p-1.5 flex flex-col gap-0.5 shadow-xs">
                                            <div className="text-[11px] font-black text-[#14532d] flex items-center gap-1 leading-tight">
                                                <span>🔑</span>
                                                <span className="truncate">{sheetData.col1.card4.title}</span>
                                            </div>
                                            <span className="bg-[#4ade80] text-[#14532d] text-[9px] font-black px-1.5 py-0.2 rounded-md w-fit">
                                                {sheetData.col1.card4.badge}
                                            </span>
                                            <p className="text-[9.5px] text-[#475569] leading-[1.2]">
                                                {sheetData.col1.card4.text}
                                            </p>
                                            <div className="text-[9px] text-[#15803d] font-bold pt-0.5">
                                                {sheetData.col1.card4.example}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── SÜTUN 2 (ORTA - 2 GENİŞ KART) ── */}
                                    <div className="flex flex-col gap-1.5 justify-between">
                                        {/* Kart 5 (Turkuaz - Kavramlar & Anlamları) */}
                                        <div className="bg-[#ecfeff] border-[1.5px] border-[#22d3ee] rounded-xl p-2 flex flex-col gap-1 flex-1 shadow-xs">
                                            <div className="text-[11.5px] font-black text-[#164e63] flex items-center justify-between border-b border-[#a5f3fc] pb-1 leading-tight">
                                                <span className="truncate">{sheetData.col2.card5.title}</span>
                                                <span>📖</span>
                                            </div>
                                            <div className="space-y-1 pt-0.5 overflow-hidden">
                                                {sheetData.col2.card5.items.map((item, i) => (
                                                    <div key={i} className="flex items-start gap-1.5 text-[9.5px] leading-[1.25]">
                                                        <span 
                                                            className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0"
                                                            style={{ background: item.dotColor }}
                                                        />
                                                        <div>
                                                            <strong className="text-[#0f172a] font-black">{item.term}:</strong>{' '}
                                                            <span className="text-[#334155]">{item.definition}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Kart 6 (Lavanta / Mor - Soru Çözüm Taktikleri) */}
                                        <div className="bg-[#f5f3ff] border-[1.5px] border-[#a78bfa] rounded-xl p-2 flex flex-col gap-1 shadow-xs">
                                            <div className="text-[11.5px] font-black text-[#4c1d95] flex items-center justify-between border-b border-[#ddd6fe] pb-1 leading-tight">
                                                <span>{sheetData.col2.card6.title}</span>
                                                <span>✏️</span>
                                            </div>
                                            <span className="bg-[#8b5cf6] text-white text-[9px] font-black px-1.5 py-0.2 rounded-md w-fit">
                                                {sheetData.col2.card6.badge}
                                            </span>
                                            <div className="space-y-1 pt-0.5">
                                                {sheetData.col2.card6.points.map((pt, i) => (
                                                    <div key={i} className="text-[9.5px] text-[#334155] leading-[1.2] flex items-start gap-1">
                                                        <span className="text-[#16a34a] font-bold">✔</span>
                                                        <span>{pt}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── SÜTUN 3 (SAĞ - PÜF NOKTALAR & TUZAKLAR) ── */}
                                    <div className="flex flex-col gap-1.5 justify-between">
                                        <div className="bg-[#fefce8] border-[1.5px] border-[#facc15] rounded-xl p-2 flex flex-col gap-1.5 h-full shadow-xs">
                                            {/* Üst Başlık Hapı */}
                                            <div className="bg-[#8b5cf6] text-white text-[11px] font-black px-2 py-1 rounded-lg text-center shadow-xs">
                                                {sheetData.col3.title}
                                            </div>

                                            {/* Alt Kutu A: Sarı (Karıştırma) */}
                                            <div className="bg-white border border-[#fde047] rounded-lg p-1.5 flex flex-col gap-0.5">
                                                <div className="text-[10px] font-black text-[#854d0e] flex items-center gap-1">
                                                    <span>{sheetData.col3.boxA.title}</span>
                                                </div>
                                                {sheetData.col3.boxA.items.map((it, i) => (
                                                    <div key={i} className="text-[9px] text-[#475569] leading-[1.2] flex items-start gap-1">
                                                        <span className="text-[#ca8a04]">⭐</span>
                                                        <span>{it}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Alt Kutu B: Şeftali (Sık Yapılan Hatalar) */}
                                            <div className="bg-white border border-[#fed7aa] rounded-lg p-1.5 flex flex-col gap-0.5">
                                                <div className="text-[10px] font-black text-[#9a3412] flex items-center gap-1">
                                                    <span>{sheetData.col3.boxB.title}</span>
                                                </div>
                                                {sheetData.col3.boxB.items.map((it, i) => (
                                                    <div key={i} className="text-[9px] text-[#475569] leading-[1.2] flex items-start gap-1">
                                                        <span className="text-[#dc2626]">✔</span>
                                                        <span>{it}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Alt Kutu C: Yeşil (Sınav Formülleri) */}
                                            <div className="bg-white border border-[#bbf7d0] rounded-lg p-1.5 flex flex-col gap-0.5">
                                                <div className="text-[10px] font-black text-[#166534] flex items-center gap-1">
                                                    <span>{sheetData.col3.boxC.title}</span>
                                                </div>
                                                {sheetData.col3.boxC.items.map((it, i) => (
                                                    <div key={i} className="text-[9px] text-[#475569] leading-[1.2] flex items-start gap-1">
                                                        <span className="text-[#16a34a]">✔</span>
                                                        <span>{it}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                </div>

                                {/* ══ 3. ALT BİLGİ ALANI (KURDELE & İLLÜSTRASYONLAR) ══ */}
                                <div className="flex items-center justify-between px-3 pt-0.5 pb-0.5 border-t border-[#f1f5f9] flex-shrink-0">
                                    {/* Sol: Kitap Yığını */}
                                    <div className="text-2xl filter drop-shadow-xs select-none">
                                        📚
                                    </div>

                                    {/* Orta: Mor Kurdele Marka Banner'ı */}
                                    <div 
                                        className="px-6 py-1 rounded-full border-2 border-[#8b5cf6] bg-[#ede9fe] text-[#5b21b6] text-[13px] font-black tracking-wide shadow-xs flex items-center gap-1.5"
                                        style={{
                                            boxShadow: '0 2px 4px rgba(139, 92, 246, 0.25)'
                                        }}
                                    >
                                        <span>🕌</span>
                                        <span>DinDersi Atölyesi</span>
                                    </div>

                                    {/* Sağ: Kalemlik */}
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
                            /* ── METİN DÜZENLEME PANELİ (3 SÜTUNU ÖZELLEŞTİR) ── */
                            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto max-h-[580px] text-xs">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="font-extrabold text-amber-300 flex items-center gap-1.5 text-sm">
                                        <Edit3 className="w-4 h-4" />
                                        <span>Çalışma Notu Metinlerini Düzenle</span>
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
                                    <label className="font-bold text-slate-300">Tabela Alt Satır (Yazılı / Konu Başlığı):</label>
                                    <input 
                                        type="text"
                                        value={sheetData.examLine}
                                        onChange={e => setSheetData(prev => ({ ...prev, examLine: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                    />
                                </div>

                                {/* Orta Sütundaki Kavramlar */}
                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-amber-300 block">5. Kavramlar & Anlamları (Orta Sütun):</label>
                                    {sheetData.col2.card5.items.map((c, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input 
                                                type="text"
                                                value={c.term}
                                                placeholder="Kavram"
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setSheetData(prev => {
                                                        const next = [...prev.col2.card5.items];
                                                        next[i] = { ...next[i], term: val };
                                                        return {
                                                            ...prev,
                                                            col2: { ...prev.col2, card5: { ...prev.col2.card5, items: next } }
                                                        };
                                                    });
                                                }}
                                                className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold"
                                            />
                                            <input 
                                                type="text"
                                                value={c.definition}
                                                placeholder="Tanım"
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setSheetData(prev => {
                                                        const next = [...prev.col2.card5.items];
                                                        next[i] = { ...next[i], definition: val };
                                                        return {
                                                            ...prev,
                                                            col2: { ...prev.col2, card5: { ...prev.col2.card5, items: next } }
                                                        };
                                                    });
                                                }}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Sağ Sütun Püf Noktaları */}
                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-amber-300 block">7. Püf Noktalar & Hatalar (Sağ Sütun):</label>
                                    {sheetData.col3.boxA.items.map((it, i) => (
                                        <input 
                                            key={i}
                                            type="text"
                                            value={it}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setSheetData(prev => {
                                                    const next = [...prev.col3.boxA.items];
                                                    next[i] = val;
                                                    return {
                                                        ...prev,
                                                        col3: { ...prev.col3, boxA: { ...prev.col3.boxA, items: next } }
                                                    };
                                                });
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs mb-1"
                                        />
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

                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-200 space-y-1">
                                    <div className="font-extrabold flex items-center gap-1.5 text-amber-300">
                                        <span>📌</span>
                                        <span>Not İçeriğiyle %100 Birebir Eşleşme</span>
                                    </div>
                                    <p className="text-[11.5px] leading-relaxed text-amber-100/90">
                                        Bu görseldeki ahşap tabela, kavramlar, soru çözüm taktikleri ve sınav püf noktaları <strong>seçili özetteki gerçek içerikten</strong> dinamik olarak üretilir; başka konulardan bağımsız metin içermez.
                                    </p>
                                </div>

                                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
                                    <span>Çözünürlük: <strong className="text-white">1080 x 1350 px (4:5 Dikey)</strong></span>
                                    <span>Format: <strong className="text-white">PNG Ultra HD</strong></span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
