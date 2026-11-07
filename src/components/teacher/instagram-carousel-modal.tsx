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

export interface YaziliVaktiSheetData {
    gradeTag: string;          // "6. Sınıf Din Kültürü ve Ahlak Bilgisi"
    unitTag: string;           // "1. ÜNİTE"
    topicTitle: string;        // "Peygamber ve İlahî Kitap İnancı"
    subTitle: string;          // "1. Dönem 1. Yazılıya Hazırlık Notları"

    // Satır 1
    card1: {
        title: string;         // "Peygamber Kimdir?"
        bullets: string[];     // 4 madde (pembe nokta)
    };
    card2: {
        title: string;         // "Peygamberlerin Özellikleri"
        items: Array<{ term: string; desc: string; color: string }>; // 5 kavram
    };

    // Satır 2
    card3: {
        title: string;         // "Peygamberlerin Görevleri"
        items: Array<{ num: number; term: string; desc: string }>;   // 6 numaralı madde
    };
    card4: {
        title: string;         // "Vahiy ve Vahyin Özellikleri"
        sub1Title: string;     // "Vahiy Nedir?"
        sub1Text: string;      // "Allah'ın seçtiği elçilere bildirdiği ilahi mesajdır."
        sub2Title: string;     // "Vahyin Özellikleri"
        sub2Bullets: string[]; // 4 yeşil onaylı madde
    };

    // Satır 3
    card5: {
        title: string;         // "İlahî Kitaplar"
        bullets: string[];     // 2 yeşil onaylı madde
    };
    card6: {
        title: string;         // "Dört Büyük İlahî Kitap"
        col1Header: string;    // "İlahî Kitap"
        col2Header: string;    // "Gönderildiği Peygamber"
        rows: Array<{ col1: string; col2: string; bg: string }>;
    };

    // Satır 4 (Unutma! Şeridi)
    unutmaBullets: string[];   // 2 yeşil onaylı altın kural
}

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
 * Notun HTML içeriğinden @yazilivakti tasarımına BİREBİR uyan veriyi ayıklar.
 */
function extractYaziliVaktiData(
    htmlContent: string,
    rawTitle: string,
    grade?: string,
    courseName?: string,
    unitName?: string
): YaziliVaktiSheetData {
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
    const gradeNumber = detectedGrade || '6';
    const gradeTag = `${gradeNumber}. Sınıf\nDin Kültürü\nve Ahlak Bilgisi`;

    const cleanUnit = cleanText(unitName || '').replace(/^\d+[\.\-\s]+/, '').trim();
    const unitTag = cleanUnit ? (cleanUnit.length > 15 ? cleanUnit.slice(0, 15) : cleanUnit) : '1. ÜNİTE';
    const subTitle = `${gradeNumber}. Sınıf 1. Dönem 1. Yazılıya Hazırlık Notları`;

    // ══ KAVRAMLARI AYIKLA (Card 2 ve Card 3 için) ══
    const extractedConcepts: Array<{ term: string; desc: string }> = [];
    if (doc) {
        doc.querySelectorAll('.concept-card, .concept-item, .box-yellow .card').forEach(cEl => {
            const termEl = cEl.querySelector('.concept-badge, .c-tag, strong, h3, h4');
            const defEl = cEl.querySelector('p, .concept-text') || cEl;
            const term = cleanText(termEl?.textContent || '').replace(/[\:\-]$/, '');
            let def = cleanText(defEl?.textContent || '');
            if (term && def.startsWith(term)) {
                def = def.slice(term.length).replace(/^[\:\-\s]+/, '').trim();
            }
            if (term && term.length >= 2 && term.length <= 35 && def.length >= 6) {
                if (!extractedConcepts.some(c => c.term.toLowerCase() === term.toLowerCase())) {
                    extractedConcepts.push({ term, desc: truncateWord(def, 65) });
                }
            }
        });

        // Tablo satırlarından kavram kontrolü
        if (extractedConcepts.length === 0) {
            doc.querySelectorAll('table tbody tr').forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 2) {
                    const term = cleanText(tds[0].textContent || '').replace(/[\:\-]$/, '');
                    const def = cleanText(tds[1].textContent || '');
                    if (term && term.length >= 2 && term.length <= 35 && def.length >= 6) {
                        extractedConcepts.push({ term, desc: truncateWord(def, 65) });
                    }
                }
            });
        }
    }

    // ══ KONU MADDELERİNİ AYIKLA (Card 1, Card 3, Card 4, Card 5 için) ══
    const extractedBullets: Array<{ title: string; text: string }> = [];
    if (doc) {
        doc.querySelectorAll('.list-item, .timeline-item, li, .columns-2 > div').forEach(liEl => {
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
                extractedBullets.push({
                    title: truncateWord(bTitle, 25),
                    text: truncateWord(bText, 95)
                });
            }
        });
    }

    // ══ BÖLÜM BAŞLIKLARINI AYIKLA ══
    const sectionTitles: string[] = [];
    if (doc) {
        doc.querySelectorAll('.box-title, h2, h3').forEach(tEl => {
            const t = cleanText(tEl.textContent || '')
                .replace(/^([📖🏔️⏳⚡⭐🎨🌱💡🔍🔑📌🕌])\s*/, '')
                .replace(/^\d+[\.\-\s]+Konu[\:\-\s]*/i, '')
                .trim();
            if (t.length >= 4 && t.length <= 40 && !sectionTitles.includes(t)) {
                sectionTitles.push(t);
            }
        });
    }

    // ══ TUZAKLAR VE ÖNEMLİ İPUÇLARI (Unutma Şeridi) ══
    const extractedTraps: string[] = [];
    if (doc) {
        doc.querySelectorAll('.trap-card, .box-green p, .box-warning').forEach(tEl => {
            const t = cleanText(tEl.textContent || '');
            if (t.length >= 15 && t.length <= 180) {
                extractedTraps.push(truncateWord(t, 120));
            }
        });
    }

    // ══ KART 1: (Sol Üst - Cyan) - 4 Madde ══
    const card1Bullets = extractedBullets.length >= 4 
        ? extractedBullets.slice(0, 4).map(b => b.title ? `${b.title}: ${b.text}` : b.text)
        : [
            `${cleanTitle} konusu MEB müfredatında yer alan kilit ilkeleri kapsar.`,
            'Sorularda verilen ayet ve hadislerin ana mesajına dikkat edilmelidir.',
            'Temel kavramların günlük hayattaki yansımaları önemlidir.',
            'Soru köklerindeki olumsuz ifadelere özellikle dikkat edilmelidir.'
        ];

    // ══ KART 2: (Sağ Üst - Sarı) - 5 Kavram ══
    const colors = ['#16a34a', '#e11d48', '#0284c7', '#9333ea', '#ea580c'];
    const card2Items = extractedConcepts.length >= 5 
        ? extractedConcepts.slice(0, 5).map((c, i) => ({
            term: c.term,
            desc: c.desc,
            color: colors[i % colors.length]
        }))
        : (extractedConcepts.length > 0 
            ? extractedConcepts.map((c, i) => ({
                term: c.term,
                desc: c.desc,
                color: colors[i % colors.length]
            }))
            : [
                { term: 'Kilit İlke', desc: 'Konunun anlaşılmasını sağlayan temel esastır.', color: '#16a34a' },
                { term: 'Önemli Terim', desc: 'Soru seçeneklerinde ayırt edici rol oynar.', color: '#e11d48' },
                { term: 'Temel Bilgi', desc: 'Yazılılarda doğrudan puan getiren kavramdır.', color: '#0284c7' }
            ]);

    // ══ KART 3: (Sol Orta - Pembe) - 6 Numaralı Madde ══
    const card3Items = extractedBullets.length >= 10 
        ? extractedBullets.slice(4, 10).map((b, i) => ({
            num: i + 1,
            term: b.title || `Madde ${i + 1}`,
            desc: b.text
        }))
        : (extractedConcepts.length >= 6 
            ? extractedConcepts.slice(0, 6).map((c, i) => ({
                num: i + 1,
                term: c.term,
                desc: c.desc
            }))
            : [
                { num: 1, term: 'Temel Amaç', desc: 'İnsanları iyiliğe ve doğru yola yönlendirmektir.' },
                { num: 2, term: 'Örnek Olmak', desc: 'Güzel ahlak ve davranışlarla topluma rehberlik etmektir.' },
                { num: 3, term: 'Sorumluluk', desc: 'İnsanın akıl ve iradesiyle eylemlerinden sorumlu olmasıdır.' },
                { num: 4, term: 'Adalet', desc: 'Hakkı gözetmek ve dengeli davranmaktır.' }
            ]);

    // ══ KART 4: (Sağ Orta - Mavi) - Vahiy & Özellikleri Formatı ══
    const sub1Text = extractedBullets[1]?.text || `${cleanTitle} konusunda ilahi rehberliğin temel ilkeleri özetlenir.`;
    const sub2Bullets = extractedBullets.length >= 8 
        ? extractedBullets.slice(4, 8).map(b => b.text)
        : [
            'Doğru, güvenilir ve rehber niteliğindedir.',
            'İnsanların dünya ve ahiret mutluluğunu hedefler.',
            'Akla ve vicdana hitap ederek yol gösterir.',
            'Ahlaki olgunluğa ulaşmayı amaçlar.'
        ];

    // ══ KART 5: (Sol Alt - Yeşil) - 2 Madde ══
    const card5Bullets = extractedBullets.length >= 2 
        ? [
            extractedBullets[0] ? (extractedBullets[0].title ? `${extractedBullets[0].title}: ${extractedBullets[0].text}` : extractedBullets[0].text) : 'İnsanlara doğru yolu ve ahlak esaslarını öğretir.',
            extractedBullets[1] ? (extractedBullets[1].title ? `${extractedBullets[1].title}: ${extractedBullets[1].text}` : extractedBullets[1].text) : 'İlahi emir ve yasakları açıklayarak rehberlik eder.'
        ]
        : [
            'İnsanlara doğru yolu ve ahlak esaslarını öğretir.',
            'İlahi emir ve yasakları açıklayarak rehberlik eder.'
        ];

    // ══ KART 6: (Sağ Alt - Tablo) ══
    const tableRows = extractedConcepts.length >= 4 
        ? extractedConcepts.slice(0, 4).map((c, i) => ({
            col1: c.term,
            col2: truncateWord(c.desc, 30),
            bg: ['#e0f2fe', '#dcfce7', '#fce7f3', '#f3e8ff'][i % 4]
        }))
        : [
            { col1: 'Kavram 1', col2: 'Temel Özellik 1', bg: '#e0f2fe' },
            { col1: 'Kavram 2', col2: 'Temel Özellik 2', bg: '#dcfce7' },
            { col1: 'Kavram 3', col2: 'Temel Özellik 3', bg: '#fce7f3' },
            { col1: 'Kavram 4', col2: 'Temel Özellik 4', bg: '#f3e8ff' }
        ];

    // ══ UNUTMA ŞERİDİ ══
    const unutmaBullets = extractedTraps.length >= 2 
        ? extractedTraps.slice(0, 2)
        : [
            `${cleanTitle} ile ilgili sorularda kavramların tanımlarını birbiriyle karıştırma.`,
            'Soru kökündeki anahtar kelimelere ve metnin genel mesajına odaklan.'
        ];

    return {
        gradeTag,
        unitTag,
        topicTitle: cleanTitle,
        subTitle,
        card1: {
            title: sectionTitles[0] ? truncateWord(sectionTitles[0], 25) : `${cleanTitle} Nedir?`,
            bullets: card1Bullets
        },
        card2: {
            title: sectionTitles[1] ? truncateWord(sectionTitles[1], 25) : `${cleanTitle} Özellikleri`,
            items: card2Items
        },
        card3: {
            title: sectionTitles[2] ? truncateWord(sectionTitles[2], 25) : `${cleanTitle} Görevleri & İlkeleri`,
            items: card3Items
        },
        card4: {
            title: sectionTitles[3] ? truncateWord(sectionTitles[3], 25) : `${cleanTitle} Detayları`,
            sub1Title: 'Temel İlke Nedir?',
            sub1Text,
            sub2Title: 'Konunun Özellikleri',
            sub2Bullets
        },
        card5: {
            title: sectionTitles[4] ? truncateWord(sectionTitles[4], 25) : `${cleanTitle} Esasları`,
            bullets: card5Bullets
        },
        card6: {
            title: 'Kavram & Eşleştirme Tablosu',
            col1Header: 'Kavram / Terim',
            col2Header: 'Önemli Açıklama',
            rows: tableRows
        },
        unutmaBullets
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

    // Başlangıç verisi
    const initialSheetData = useMemo(() => {
        return extractYaziliVaktiData(htmlContent, title, grade, courseName, unitName);
    }, [htmlContent, title, grade, courseName, unitName]);

    const [data, setData] = useState<YaziliVaktiSheetData>(initialSheetData);

    useEffect(() => {
        setData(initialSheetData);
    }, [initialSheetData]);

    // Hazır Instagram Açıklama Metni (Caption)
    const captionText = useMemo(() => {
        return `📌 ${data.topicTitle} | Yazılıya Hazırlık Çalışma Notu 📖✨\n\n` +
            `Sınavlar ve yazılılar öncesi ${data.topicTitle} konusunun tüm kilit noktalarını ve önemli yerlerini tek görselde topladık! 💡\n\n` +
            `💾 Sınav haftasında hızlıca tekrar etmek için bu gönderiyi KAYDET'e basmayı unutma!\n` +
            `👥 Sınıf arkadaşlarınla paylaşarak onların da faydalanmasını sağlayabilirsin. 🚀\n\n` +
            `📲 Bu ünitenin interaktif eğitici oyunlarını ücretsiz oynamak için profilimizdeki linke tıkla!\n\n` +
            `#dinkültürü #${title.replace(/\s+/g, '').toLowerCase()} #yazılıyahazırlık #çalışmanotu #lgs #ortaokul #dindersiatolyesi #meb #öğretmen #öğrenci`;
    }, [data, title]);

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
    const handleDownload = async () => {
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
            link.download = `${data.topicTitle.replace(/\s+/g, '_')}_Yaziliya_Hazirlik_Notu.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast({
                title: 'Çalışma Notu İndirildi! 🎉',
                description: 'Ultra net 1080x1350 Instagram formatında başarıyla kaydedildi.',
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
                {/* Popüler Yuvarlak ve Başlık Fontları */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800;900&family=Nunito:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap" rel="stylesheet" />

                {/* MODAL ÜST BARI */}
                <DialogHeader className="pb-2.5 border-b border-slate-800 flex-shrink-0 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-pink-900/30 flex-shrink-0 text-xl font-black">
                            🕌
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                                <span>Yazılı Vakti Formatı (Instagram 4:5)</span>
                                <Badge className="bg-pink-500/20 text-pink-300 border-pink-400/30 text-[10px] hidden sm:inline-flex">
                                    1080 x 1350 px
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 truncate">
                                {data.topicTitle} • Tamamen @yazilivakti tasarımında 2 sütunlu infografik not
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingData(prev => !prev)}
                            className={`border rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 cursor-pointer ${
                                isEditingData 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                            title="Kelimeleri ve başlıkları düzenle"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isEditingData ? 'Önizleme' : 'Metinleri Düzenle'}</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleCopyCaption}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 cursor-pointer"
                            title="Hazır Instagram Açıklama ve Etiketlerini Kopyala"
                        >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                            <span className="hidden sm:inline">{isCopied ? 'Kopyalandı' : 'Metni Kopyala'}</span>
                        </Button>

                        <Button
                            size="sm"
                            onClick={handleDownload}
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
                                    <span>Görseli İndir (PNG)</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                {/* ANA ÇALIŞMA ALANI */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center gap-4 py-2 overflow-hidden">
                    
                    {/* SOL: 4:5 Dikey Yazılı Vakti Tuvali (540px x 675px -> x2 = 1080px x 1350px) */}
                    <div className="flex flex-col items-center justify-center h-full max-h-full">
                        <div className="relative p-1 rounded-[1.25rem] bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                            
                            {/* ═══════════════════════════════════════════════════════════════════ */}
                            {/* GERÇEK ÇIKTI ALINACAK 540 x 675 PX (TAM @YAZILIVAKTİ DİZAYNI) */}
                            {/* ═══════════════════════════════════════════════════════════════════ */}
                            <div
                                ref={captureRef}
                                className="w-[540px] h-[675px] bg-[#ffffff] rounded-xl shadow-xl overflow-hidden flex flex-col justify-between relative select-none p-3"
                                style={{
                                    fontFamily: "'Fredoka', 'Nunito', 'Plus Jakarta Sans', sans-serif",
                                    boxSizing: 'border-box',
                                    color: '#0f172a'
                                }}
                            >
                                {/* ══ 1. ÜST BAŞLIK ALANI (TAM RESİMDEKİ GİBİ) ══ */}
                                <div className="flex items-center justify-between relative flex-shrink-0 pt-0.5 pb-1">
                                    {/* Sol: Sarı Konuşma Balonu Çıkartması */}
                                    <div 
                                        className="bg-[#fde047] border-[2px] border-[#000000] rounded-2xl px-2.5 py-1 text-center shadow-xs transform -rotate-3 select-none flex-shrink-0"
                                        style={{ width: '105px' }}
                                    >
                                        <div className="text-[10px] font-black leading-tight text-[#000000] whitespace-pre-line">
                                            {data.gradeTag}
                                        </div>
                                    </div>

                                    {/* Orta: YAZILI VAKTİ ve Ünite Başlığı */}
                                    <div className="flex flex-col items-center text-center relative z-10 flex-1 px-1">
                                        {/* Arkadaki Pembe Işıma Efekti */}
                                        <div className="text-[23px] font-black tracking-tight text-[#0f172a] leading-none mb-0.5 flex items-center gap-1.5 drop-shadow-xs">
                                            <span className="text-pink-500 text-sm">✨</span>
                                            <span className="tracking-wider">YAZILI VAKTİ</span>
                                            <span className="text-pink-500 text-sm">✨</span>
                                        </div>

                                        {/* 1. Ünite Hapı */}
                                        <div className="bg-[#f3e8ff] border-[1.5px] border-[#a855f7] text-[#6b21a8] text-[9.5px] font-black px-3 py-0.2 rounded-full uppercase tracking-wider mb-0.5">
                                            {data.unitTag}
                                        </div>

                                        {/* Konu Başlığı Hapı (Mavi, Yanlarında Pembe Işınlar) */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-pink-500 text-xs font-black">❯</span>
                                            <div className="bg-[#e0f2fe] border-[2px] border-[#0284c7] text-[#0369a1] text-[12.5px] font-black px-4 py-0.5 rounded-full shadow-xs truncate max-w-[280px]">
                                                {data.topicTitle}
                                            </div>
                                            <span className="text-pink-500 text-xs font-black">❮</span>
                                        </div>

                                        {/* Alt Pembe Çizgili Hap */}
                                        <div className="bg-[#fce7f3] border border-[#ec4899] text-[#be185d] text-[8.5px] font-black px-3 py-0.2 rounded-full mt-0.5">
                                            {data.subTitle}
                                        </div>
                                    </div>

                                    {/* Sağ: Sevimli Cami İllüstrasyonu (SVG) */}
                                    <div className="w-16 h-14 flex items-center justify-end select-none flex-shrink-0">
                                        <svg viewBox="0 0 100 90" className="w-14 h-14" fill="none">
                                            <rect x="15" y="75" width="70" height="8" rx="2" fill="#e2e8f0" stroke="#000000" strokeWidth="2" />
                                            <ellipse cx="20" cy="78" rx="12" ry="7" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5" />
                                            <ellipse cx="80" cy="78" rx="12" ry="7" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5" />
                                            <rect x="22" y="25" width="8" height="52" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                                            <polygon points="26,10 21,25 31,25" fill="#fde047" stroke="#000000" strokeWidth="1.5" />
                                            <rect x="70" y="25" width="8" height="52" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                                            <polygon points="74,10 69,25 79,25" fill="#fde047" stroke="#000000" strokeWidth="1.5" />
                                            <rect x="32" y="45" width="36" height="32" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                                            <path d="M44 77 V60 A6 6 0 0 1 56 60 V77 Z" fill="#0284c7" stroke="#000000" strokeWidth="2" />
                                            <path d="M30 45 A20 20 0 0 1 70 45 Z" fill="#38bdf8" stroke="#000000" strokeWidth="2" />
                                            <circle cx="38" cy="40" r="1.5" fill="#000000" />
                                            <circle cx="44" cy="38" r="1.5" fill="#000000" />
                                            <circle cx="50" cy="37" r="1.5" fill="#000000" />
                                            <circle cx="56" cy="38" r="1.5" fill="#000000" />
                                            <circle cx="62" cy="40" r="1.5" fill="#000000" />
                                            <path d="M50 20 A5 5 0 1 0 54 26 A6 6 0 1 1 50 20 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
                                        </svg>
                                    </div>
                                </div>

                                {/* ══ 2. SATIR 1: İKİ SÜTUN (KART 1 & KART 2) ══ */}
                                <div className="grid grid-cols-2 gap-2.5 my-1">
                                    {/* KART 1: Peygamber Kimdir? (Mavi Kart) */}
                                    <div className="border-[2px] border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 relative flex flex-col justify-between">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bae6fd] border-[2px] border-[#0284c7] text-[#0369a1] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                            {data.card1.title}
                                        </div>
                                        <div className="flex items-center justify-between gap-1 mt-2.5">
                                            <div className="space-y-1 flex-1">
                                                {data.card1.bullets.map((b, i) => (
                                                    <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.2] flex items-start gap-1.5">
                                                        <span className="text-[#ec4899] text-xs font-black flex-shrink-0">•</span>
                                                        <span>{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Yeşil Kubbe Mescid-i Nebevi Clipart */}
                                            <div className="w-12 h-12 flex-shrink-0 self-end">
                                                <svg viewBox="0 0 70 70" className="w-12 h-12" fill="none">
                                                    <rect x="10" y="52" width="50" height="15" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                                    <path d="M20 52 A15 15 0 0 1 50 52 Z" fill="#16a34a" stroke="#000000" strokeWidth="1.5" />
                                                    <rect x="12" y="30" width="5" height="37" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                                    <polygon points="14.5,20 11,30 18,30" fill="#fde047" stroke="#000000" strokeWidth="1" />
                                                    <path d="M35 34 A4 4 0 1 0 38 39 A5 5 0 1 1 35 34 Z" fill="#fde047" />
                                                    <ellipse cx="35" cy="65" rx="25" ry="4" fill="#86efac" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KART 2: Peygamberlerin Özellikleri (Sarı Kart) */}
                                    <div className="border-[2px] border-[#facc15] bg-[#fefce8] rounded-2xl p-2 relative flex flex-col justify-between">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fef08a] border-[2px] border-[#ca8a04] text-[#854d0e] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                            {data.card2.title}
                                        </div>
                                        <div className="space-y-1 mt-2.5">
                                            {data.card2.items.map((it, i) => (
                                                <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1.5">
                                                    <span className="text-xs font-black flex-shrink-0" style={{ color: it.color }}>✔</span>
                                                    <div>
                                                        <strong className="text-[#0f172a] font-black">{it.term}</strong>
                                                        <span className="text-[#64748b] font-black"> : </span>
                                                        <span className="text-[#334155]">{it.desc}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ══ 3. SATIR 2: İKİ SÜTUN (KART 3 & KART 4) ══ */}
                                <div className="grid grid-cols-2 gap-2.5 my-1">
                                    {/* KART 3: Peygamberlerin Görevleri (Pembe Kart - 6 Numaralı Madde) */}
                                    <div className="border-[2px] border-[#f472b6] bg-[#fdf2f8] rounded-2xl p-2 relative flex flex-col justify-between">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fbcfe8] border-[2px] border-[#db2777] text-[#9d174d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                            {data.card3.title}
                                        </div>
                                        <div className="space-y-1 mt-2.5">
                                            {data.card3.items.map((it, i) => (
                                                <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.2] flex items-start gap-1.5">
                                                    <div className="w-4 h-4 rounded-full bg-[#ec4899] text-white flex items-center justify-center text-[9px] font-black flex-shrink-0 mt-0.5">
                                                        {it.num}
                                                    </div>
                                                    <div>
                                                        <strong className="text-[#0f172a] font-black">{it.term}</strong>
                                                        <span className="text-[#64748b] font-black"> : </span>
                                                        <span className="text-[#334155]">{it.desc}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* KART 4: Vahiy ve Vahyin Özellikleri (Mavi Kart) */}
                                    <div className="border-[2px] border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 relative flex flex-col justify-between">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bae6fd] border-[2px] border-[#0284c7] text-[#0369a1] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                            {data.card4.title}
                                        </div>
                                        <div className="mt-2.5 space-y-1.5">
                                            {/* Üst Kısım: Vahiy Nedir? */}
                                            <div className="flex items-center justify-between gap-1">
                                                <div>
                                                    <div className="bg-[#fef08a] border border-[#ca8a04] text-[#854d0e] text-[9px] font-black px-2 py-0.2 rounded-full w-fit mb-0.5">
                                                        {data.card4.sub1Title}
                                                    </div>
                                                    <p className="text-[9px] font-semibold text-[#334155] leading-[1.2]">
                                                        ➔ {data.card4.sub1Text}
                                                    </p>
                                                </div>
                                                {/* Rahle / Kur'an Clipart */}
                                                <div className="w-10 h-8 flex-shrink-0">
                                                    <svg viewBox="0 0 70 55" className="w-10 h-8" fill="none">
                                                        <path d="M15 50 L45 30 L55 50 M55 50 L25 30 L15 50" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
                                                        <path d="M12 28 Q35 34 35 38 Q35 34 58 28 L55 12 Q35 18 35 20 Q35 18 15 12 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                                        <line x1="20" y1="18" x2="30" y2="21" stroke="#cbd5e1" strokeWidth="1" />
                                                        <line x1="40" y1="21" x2="50" y2="18" stroke="#cbd5e1" strokeWidth="1" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Alt Kısım: Vahyin Özellikleri */}
                                            <div>
                                                <div className="bg-[#ede9fe] border border-[#8b5cf6] text-[#6b21a8] text-[9px] font-black px-2 py-0.2 rounded-full w-fit mb-0.5">
                                                    {data.card4.sub2Title}
                                                </div>
                                                <div className="flex items-end justify-between">
                                                    <div className="space-y-0.5 flex-1">
                                                        {data.card4.sub2Bullets.map((b, i) => (
                                                            <div key={i} className="text-[9px] font-semibold text-[#334155] leading-[1.2] flex items-start gap-1">
                                                                <span className="text-emerald-600 font-black text-xs">✔</span>
                                                                <span>{b}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Yaprak Clipart */}
                                                    <div className="w-6 h-6 flex-shrink-0">
                                                        <svg viewBox="0 0 30 30" className="w-6 h-6" fill="none">
                                                            <path d="M6 24 C10 16 18 10 26 6 C20 14 16 22 6 24 Z" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5" />
                                                            <path d="M14 16 C16 12 22 10 24 8" stroke="#16a34a" strokeWidth="1" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ══ 4. SATIR 3: İKİ SÜTUN (KART 5 & KART 6 TABLO) ══ */}
                                <div className="grid grid-cols-2 gap-2.5 my-1">
                                    {/* KART 5: İlahî Kitaplar (Yeşil Kart) */}
                                    <div className="border-[2px] border-[#4ade80] bg-[#f0fdf4] rounded-2xl p-2 relative flex flex-col justify-between">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bbf7d0] border-[2px] border-[#16a34a] text-[#14532d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                            {data.card5.title}
                                        </div>
                                        <div className="flex items-center justify-between gap-1 mt-2.5">
                                            <div className="space-y-1 flex-1">
                                                {data.card5.bullets.map((b, i) => (
                                                    <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1">
                                                        <span className="text-emerald-600 font-black text-xs">✔</span>
                                                        <span>{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Kitap Yığını Clipart */}
                                            <div className="w-14 h-14 flex-shrink-0">
                                                <svg viewBox="0 0 75 75" className="w-14 h-14" fill="none">
                                                    <rect x="15" y="14" width="48" height="11" rx="2" fill="#1d4ed8" stroke="#000000" strokeWidth="1.5" />
                                                    <text x="39" y="22" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Tevrat</text>
                                                    <rect x="12" y="27" width="52" height="11" rx="2" fill="#c2410c" stroke="#000000" strokeWidth="1.5" />
                                                    <text x="38" y="35" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Zebur</text>
                                                    <rect x="15" y="40" width="50" height="11" rx="2" fill="#b91c1c" stroke="#000000" strokeWidth="1.5" />
                                                    <text x="40" y="48" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">İncil</text>
                                                    <rect x="10" y="53" width="56" height="12" rx="2" fill="#15803d" stroke="#000000" strokeWidth="1.5" />
                                                    <text x="38" y="62" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Kur'an-ı Kerim</text>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KART 6: Dört Büyük İlahî Kitap Tablosu */}
                                    <div className="border-[2px] border-[#f472b6] bg-[#fdf2f8] rounded-2xl p-1.5 relative flex flex-col justify-between">
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fbcfe8] border-[2px] border-[#db2777] text-[#9d174d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                            {data.card6.title}
                                        </div>
                                        <div className="mt-2.5 overflow-hidden rounded-xl border border-[#cbd5e1]">
                                            <table className="w-full text-center border-collapse">
                                                <thead>
                                                    <tr className="bg-[#fef08a] text-[9.5px] font-black text-[#854d0e]">
                                                        <th className="py-1 border-r border-[#cbd5e1]">{data.card6.col1Header}</th>
                                                        <th className="py-1">{data.card6.col2Header}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[9px] font-bold text-[#1e293b]">
                                                    {data.card6.rows.map((r, i) => (
                                                        <tr key={i} style={{ background: r.bg }} className="border-t border-[#cbd5e1]">
                                                            <td className="py-0.5 border-r border-[#cbd5e1] font-black">{r.col1}</td>
                                                            <td className="py-0.5">{r.col2}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                {/* ══ 5. SATIR 4: UNUTMA! ŞERİDİ (TAM EN ALT KUTUSU) ══ */}
                                <div className="border-[2px] border-dashed border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 flex items-center justify-between gap-2 my-0.5">
                                    {/* Tilted Unutma! Çıkartması */}
                                    <div 
                                        className="bg-[#fde047] border-[2px] border-[#000000] rounded-xl px-3 py-1 shadow-xs transform -rotate-3 select-none flex-shrink-0"
                                    >
                                        <span className="text-[14px] font-black text-[#000000] tracking-tight">Unutma!</span>
                                    </div>

                                    {/* 2 Önemli Madde */}
                                    <div className="space-y-0.5 flex-1 px-1">
                                        {data.unutmaBullets.map((b, i) => (
                                            <div key={i} className="text-[9.5px] font-bold text-[#1e293b] leading-[1.25] flex items-start gap-1.5">
                                                <span className="text-emerald-600 font-black text-xs">✔</span>
                                                <span>{b}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Sağ Rahle Clipart */}
                                    <div className="w-12 h-9 flex-shrink-0">
                                        <svg viewBox="0 0 70 55" className="w-12 h-9" fill="none">
                                            <path d="M15 50 L45 30 L55 50 M55 50 L25 30 L15 50" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
                                            <path d="M12 28 Q35 34 35 38 Q35 34 58 28 L55 12 Q35 18 35 20 Q35 18 15 12 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                            <line x1="20" y1="18" x2="30" y2="21" stroke="#cbd5e1" strokeWidth="1" />
                                            <line x1="40" y1="21" x2="50" y2="18" stroke="#cbd5e1" strokeWidth="1" />
                                        </svg>
                                    </div>
                                </div>

                                {/* ══ 6. EN ALT İMZA BARI ══ */}
                                <div className="flex items-center justify-end pt-0.5">
                                    <span className="bg-[#ede9fe] text-[#7c3aed] text-[9.5px] font-black px-2.5 py-0.5 rounded-full border border-[#c4b5fd]">
                                        @dindersiatolyesi
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ: Metin Düzenleme Paneli veya Hazır Açıklama */}
                    <div className="flex-1 min-w-0 h-full flex flex-col gap-3 justify-between">
                        {isEditingData ? (
                            /* ── METİN DÜZENLEME PANELİ ── */
                            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto max-h-[580px] text-xs">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="font-extrabold text-amber-300 flex items-center gap-1.5 text-sm">
                                        <Edit3 className="w-4 h-4" />
                                        <span>Görseldeki Metinleri Düzenle</span>
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setData(initialSheetData)}
                                        className="h-7 text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                        title="Orijinal içeriğe geri dön"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Sıfırla
                                    </Button>
                                </div>

                                {/* Üst Başlıklar */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Ana Konu Başlığı:</label>
                                    <input 
                                        type="text"
                                        value={data.topicTitle}
                                        onChange={e => setData(prev => ({ ...prev, topicTitle: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Üst Etiket (Sınıf & Ders):</label>
                                    <textarea 
                                        rows={2}
                                        value={data.gradeTag}
                                        onChange={e => setData(prev => ({ ...prev, gradeTag: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold"
                                    />
                                </div>

                                {/* Kart 1 Başlık & Maddeler */}
                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-cyan-300 block">1. Kart (Mavi): {data.card1.title}</label>
                                    <input 
                                        type="text"
                                        value={data.card1.title}
                                        onChange={e => setData(prev => ({ ...prev, card1: { ...prev.card1, title: e.target.value } }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold mb-1"
                                    />
                                    {data.card1.bullets.map((b, i) => (
                                        <input 
                                            key={i}
                                            type="text"
                                            value={b}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setData(prev => {
                                                    const next = [...prev.card1.bullets];
                                                    next[i] = val;
                                                    return { ...prev, card1: { ...prev.card1, bullets: next } };
                                                });
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px] mb-1"
                                        />
                                    ))}
                                </div>

                                {/* Kart 2 Başlık & Kavramlar */}
                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-amber-300 block">2. Kart (Sarı): {data.card2.title}</label>
                                    <input 
                                        type="text"
                                        value={data.card2.title}
                                        onChange={e => setData(prev => ({ ...prev, card2: { ...prev.card2, title: e.target.value } }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold mb-1"
                                    />
                                    {data.card2.items.map((it, i) => (
                                        <div key={i} className="flex gap-1.5 mb-1">
                                            <input 
                                                type="text"
                                                value={it.term}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setData(prev => {
                                                        const next = [...prev.card2.items];
                                                        next[i] = { ...next[i], term: val };
                                                        return { ...prev, card2: { ...prev.card2, items: next } };
                                                    });
                                                }}
                                                className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold text-[11px]"
                                            />
                                            <input 
                                                type="text"
                                                value={it.desc}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setData(prev => {
                                                        const next = [...prev.card2.items];
                                                        next[i] = { ...next[i], desc: val };
                                                        return { ...prev, card2: { ...prev.card2, items: next } };
                                                    });
                                                }}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2">
                                    <Button
                                        size="sm"
                                        onClick={() => setIsEditingData(false)}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-8 cursor-pointer"
                                    >
                                        Değişiklikleri Uygula ✨
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
                                            <span>Instagram Açıklama Metni (Caption)</span>
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

                                <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-3 text-xs text-pink-200 space-y-1">
                                    <div className="font-extrabold flex items-center gap-1.5 text-pink-300">
                                        <span>🎨</span>
                                        <span>Tam Referans Görsel Tasarımı</span>
                                    </div>
                                    <p className="text-[11.5px] leading-relaxed text-pink-100/90">
                                        Yüklediğiniz görseldeki <strong>YAZILI VAKTİ</strong> başlığı, sol sarı çıkartma, sağ sevimli cami, Mescid-i Nebevi yeşil kubbesi, 6 numaralı pembe maddeler, Dört Büyük Kitap tablosu ve alt <strong>Unutma!</strong> kutusu birebir kurgulanmıştır.
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
