'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Download, Copy, Check, Sparkles, Loader2, Edit3, RotateCcw, Wand2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateInstagramPostWithAi, YaziliVaktiSheetData } from '@/app/teacher/ozetler/actions';

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

function cleanText(text: string): string {
    if (!text) return '';
    return text
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanCompleteSentence(text: string, maxLen: number = 130): string {
    const clean = cleanText(text);
    if (!clean) return '';
    // Nokta, soru işareti veya ünlem ile biten ilk cümleyi eksiksiz yakala
    const m = clean.match(/^([^\.\?\!]+[\.\?\!])/);
    if (m && m[1].length >= 12 && m[1].length <= maxLen) {
        return m[1].trim();
    }
    // Uygun uzunluktaysa tam dön ve nokta ile bitmesini sağla
    if (clean.length <= maxLen) {
        return clean.endsWith('.') || clean.endsWith('!') || clean.endsWith('?') ? clean : `${clean}.`;
    }
    // Mecburen kısaltılacaksa kelime sınırında bitir ve nokta koy (asla yarım kelime bırakma)
    const sub = clean.slice(0, maxLen);
    const lastSpace = sub.lastIndexOf(' ');
    const cut = (lastSpace > 15 ? sub.slice(0, lastSpace) : sub).trim();
    return cut.endsWith('.') || cut.endsWith('!') || cut.endsWith('?') ? cut : `${cut}.`;
}

/**
 * Notun HTML'inden Yazılı Vakti (6 Kart + Tablo) şablonuna 100% dinamik veri çıkarır.
 */
function extractYaziliVaktiDataFromNote(
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

    let detectedGrade = grade || '';
    if (!detectedGrade) {
        const m = (htmlContent + ' ' + rawTitle).match(/(\d+)\.\s*Sınıf/i);
        if (m) detectedGrade = m[1];
    }
    const gradeNumber = detectedGrade || '6';
    const gradeTag = `${gradeNumber}. Sınıf\nDin Kültürü\nve Ahlak Bilgisi`;

    let doc: Document | null = null;
    if (typeof window !== 'undefined' && htmlContent) {
        try {
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlContent, 'text/html');
        } catch {
            doc = null;
        }
    }

    // Gerçek başlığı yakala
    if (doc) {
        const h1 = doc.querySelector('.title-banner, h1, .header-title');
        if (h1 && h1.textContent?.trim()) {
            const h1Text = cleanText(h1.textContent).replace(/^\d+[\.\-\s]+/, '');
            if (h1Text.length > 2 && h1Text.length < 50) {
                cleanTitle = h1Text;
            }
        }
    }

    const cleanUnit = cleanText(unitName || '').replace(/^\d+[\.\-\s]+/, '').trim();
    const unitTag = cleanUnit ? (cleanUnit.length > 18 ? cleanUnit.slice(0, 18) : cleanUnit) : '1. ÜNİTE';
    const subTitle = `${gradeNumber}. Sınıf 1. Dönem 1. Yazılıya Hazırlık Notları`;

    // 1. Notun Gerçek Kavramlarını Ayıkla (.concept-card, table, strong)
    const extractedConcepts: Array<{ term: string; desc: string }> = [];
    if (doc) {
        doc.querySelectorAll('.concept-card, .concept-item, .box-yellow .card, table tbody tr').forEach(cEl => {
            const termEl = cEl.querySelector('.concept-badge, .c-tag, strong, h3, h4, td:first-child');
            const defEl = cEl.querySelector('p, .concept-text, td:nth-child(2)') || cEl;
            const term = cleanText(termEl?.textContent || '').replace(/[\:\-]$/, '');
            let def = cleanText(defEl?.textContent || '');
            if (term && def.startsWith(term)) {
                def = def.slice(term.length).replace(/^[\:\-\s]+/, '').trim();
            }
            if (term && term.length >= 2 && term.length <= 35 && def.length >= 6) {
                if (!extractedConcepts.some(c => c.term.toLowerCase() === term.toLowerCase())) {
                    extractedConcepts.push({ term, desc: cleanCompleteSentence(def, 95) });
                }
            }
        });
    }

    // 2. Notun Gerçek Liste Maddelerini Ayıkla (.list-item, li, p)
    const extractedBullets: Array<{ title: string; text: string }> = [];
    if (doc) {
        doc.querySelectorAll('.list-item, .timeline-item, li').forEach(liEl => {
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
                    title: cleanText(bTitle).slice(0, 30),
                    text: cleanCompleteSentence(bText, 120)
                });
            }
        });
    }

    // 3. Notun Gerçek Tuzak / Dikkat Maddelerini Ayıkla
    const extractedTraps: string[] = [];
    if (doc) {
        doc.querySelectorAll('.trap-card, .box-green p, .quote-box, .box-warning').forEach(tEl => {
            let t = cleanText(tEl.textContent || '')
                .replace(/^Tuzak\s*[\:\-\s]*/i, '')
                .replace(/^Dikkat\s*[\:\-\s]*/i, '')
                .replace(/^Altın Kural\s*[\:\-\s]*/i, '');
            if (t.length >= 12 && t.length <= 160 && !extractedTraps.includes(t)) {
                extractedTraps.push(cleanCompleteSentence(t, 130));
            }
        });
    }

    // ══ KART 1: Sol Üst - Mavi Kart (4 Madde, Pembe Noktalar) ══
    const card1Bullets = extractedBullets.length >= 4 
        ? extractedBullets.slice(0, 4).map(b => b.title ? `${b.title}: ${b.text}` : b.text)
        : [
            `${cleanTitle} konusu MEB müfredatında yer alan kilit ilkeleri kapsar.`,
            'Sorularda verilen ayet ve hadislerin ana mesajına dikkat edilmelidir.',
            'Temel kavramların günlük hayattaki yansımaları önemlidir.',
            'Soru köklerindeki olumsuz ifadelere özellikle dikkat edilmelidir.'
        ];

    // ══ KART 2: Sağ Üst - Sarı Kart (5 Kavram, Renkli Onaylar) ══
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
                { term: 'Temel Bilgi', desc: 'Yazılılarda doğrudan puan getiren kavramdır.', color: '#0284c7' },
                { term: 'Uygulama', desc: 'Ahlaki ve ibadi hayatımıza rehberlik eder.', color: '#9333ea' },
                { term: 'Kazanım', desc: 'MEB sınavlarında sıkça vurgulanan mesajdır.', color: '#ea580c' }
            ]);

    // ══ KART 3: Sol Orta - Pembe Kart (6 Numaralı Madde, Pembe Rozetler ❶-❻) ══
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
                { num: 4, term: 'Adalet', desc: 'Hakkı gözetmek ve dengeli davranmaktır.' },
                { num: 5, term: 'Birlik', desc: 'Müminlerin dayanışma ve kardeşliğini pekiştirmektir.' },
                { num: 6, term: 'Huzur', desc: 'Dünya ve ahiret mutluluğuna ulaştırmaktır.' }
            ]);

    // ══ KART 4: Sağ Orta - Mavi Kart (2 Alt Bölüm) ══
    const sub1Text = extractedBullets[1]?.text || `${cleanTitle} konusunda ilahi rehberliğin temel ilkeleri özetlenir.`;
    const sub2Bullets = extractedBullets.length >= 8 
        ? extractedBullets.slice(4, 8).map(b => b.text)
        : [
            'Doğru, güvenilir ve rehber niteliğindedir.',
            'İnsanların dünya ve ahiret mutluluğunu hedefler.',
            'Akla ve vicdana hitap ederek yol gösterir.',
            'Ahlaki olgunluğa ulaşmayı amaçlar.'
        ];

    // ══ KART 5: Sol Alt - Yeşil Kart (2 Madde, Kitap Yığını) ══
    const card5Bullets = extractedBullets.length >= 2 
        ? [
            extractedBullets[0] ? (extractedBullets[0].title ? `${extractedBullets[0].title}: ${extractedBullets[0].text}` : extractedBullets[0].text) : 'İnsanlara doğru yolu ve ahlak esaslarını öğretir.',
            extractedBullets[1] ? (extractedBullets[1].title ? `${extractedBullets[1].title}: ${extractedBullets[1].text}` : extractedBullets[1].text) : 'İlahi emir ve yasakları açıklayarak rehberlik eder.'
        ]
        : [
            'İnsanlara doğru yolu ve ahlak esaslarını öğretir.',
            'İlahi emir ve yasakları açıklayarak rehberlik eder.'
        ];

    // ══ KART 6: Sağ Alt - Pembe Kart (2 Sütunlu Pastel Tablo) ══
    const tableRows = extractedConcepts.length >= 4 
        ? extractedConcepts.slice(0, 4).map((c, i) => ({
            col1: c.term,
            col2: cleanCompleteSentence(c.desc, 70),
            bg: ['#e0f2fe', '#dcfce7', '#fce7f3', '#f3e8ff'][i % 4]
        }))
        : [
            { col1: 'Kavram 1', col2: 'Konunun temel tanımı ve esası', bg: '#e0f2fe' },
            { col1: 'Kavram 2', col2: 'Soru çözümlerinde kilit rol oynar', bg: '#dcfce7' },
            { col1: 'Kavram 3', col2: 'Kazanımlarda sıkça vurgulanır', bg: '#fce7f3' },
            { col1: 'Kavram 4', col2: 'Yazılı sınavda doğrudan soru getirir', bg: '#f3e8ff' }
        ];

    // ══ UNUTMA ŞERİDİ: En Alt Şerit ══
    const unutmaBullets = extractedTraps.length >= 2 
        ? extractedTraps.slice(0, 2)
        : [
            `${cleanTitle} ile ilgili sorularda kavramların tanımlarını birbiriyle karıştırma.`,
            'Soru kökündeki anahtar kelimelere ve metnin genel mesajına odaklan.'
        ];

    return {
        gradeTag,
        unitTag,
        brandTitle: 'DinDersi Atölyesi',
        topicTitle: cleanTitle,
        subTitle,
        card1: {
            title: `${cleanTitle} Nedir?`,
            bullets: card1Bullets
        },
        card2: {
            title: `${cleanTitle} Özellikleri & Kavramları`,
            items: card2Items
        },
        card3: {
            title: `${cleanTitle} Görevleri & İlkeleri`,
            items: card3Items
        },
        card4: {
            title: `${cleanTitle} Detayları`,
            sub1Title: 'Temel İlke Nedir?',
            sub1Text,
            sub2Title: 'Konunun Özellikleri',
            sub2Bullets
        },
        card5: {
            title: `${cleanTitle} Esasları`,
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
    sourceText
}: InstagramCarouselModalProps) {
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [isEditingData, setIsEditingData] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState<'yazili_vakti' | 'doodle_calisma_notu'>('yazili_vakti');
    const captureRef = useRef<HTMLDivElement>(null);

    // Başlangıç verisi: O an açık olan notun içeriğinden çıkar
    const initialData = useMemo(() => {
        return extractYaziliVaktiDataFromNote(htmlContent, title, grade, courseName, unitName);
    }, [htmlContent, title, grade, courseName, unitName]);

    const [data, setData] = useState<YaziliVaktiSheetData>(initialData);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    // Hazır Instagram Açıklama Metni (Caption)
    const captionText = useMemo(() => {
        return `📌 ${data.topicTitle} | Yazılıya Hazırlık Çalışma Notu 📖✨\n\n` +
            `Sınavlar ve yazılılar öncesi ${data.topicTitle} konusunun tüm kilit noktalarını ve önemli yerlerini tek görselde topladık! 💡\n\n` +
            `💾 Sınav haftasında hızlıca tekrar etmek için bu gönderiyi KAYDET'e basmayı unutma!\n` +
            `👥 Sınıf arkadaşlarınla paylaşarak onların da faydalanmasını sağlayabilirsin. 🚀\n\n` +
            `📲 Bu ünitenin interaktif eğitici oyunlarını ücretsiz oynamak için profilimizdeki linke tıkla!\n\n` +
            `#dinkültürü #${title.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '').toLowerCase()} #yazılıyahazırlık #çalışmanotu #lgs #ortaokul #dindersiatolyesi #meb #öğretmen #öğrenci`;
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

    // 🤖 Yapay Zeka ile Bu Nota Özel Doldur
    const handleGenerateAiCustomPost = async () => {
        setIsGeneratingAi(true);
        try {
            toast({
                title: 'Yapay Zeka Taranıyor... ✨',
                description: `"${title}" içeriği incelenerek DinDersi Atölyesi formatında 6 kart ve tablo hazırlanıyor...`
            });

            const res = await generateInstagramPostWithAi({
                title,
                htmlContent,
                sourceText,
                grade,
                unitTitle: unitName || title,
                courseTitle: courseName
            });

            if (res.success && res.data) {
                const colors = ['#16a34a', '#e11d48', '#0284c7', '#9333ea', '#ea580c'];
                const card2WithColors = (res.data.card2?.items || []).map((it, i) => ({
                    ...it,
                    color: it.color || colors[i % colors.length]
                }));

                const bgColors = ['#e0f2fe', '#dcfce7', '#fce7f3', '#f3e8ff'];
                const tableWithBgs = (res.data.card6?.rows || []).map((r, i) => ({
                    ...r,
                    bg: r.bg || bgColors[i % bgColors.length]
                }));

                setData({
                    ...res.data,
                    card2: {
                        ...res.data.card2,
                        items: card2WithColors
                    },
                    card6: {
                        ...res.data.card6,
                        rows: tableWithBgs
                    }
                });

                toast({
                    title: 'Bu Nota Özel Post Hazır! 🌟',
                    description: `"${title}" konusuna %100 sadık 6 kart ve tablo başarıyla oluşturuldu.`
                });
            } else {
                toast({
                    title: 'Hata',
                    description: res.error || 'Yapay zeka yanıt vermedi.',
                    variant: 'destructive'
                });
            }
        } catch (error: any) {
            console.error('AI post error:', error);
            toast({
                title: 'Hata',
                description: error.message || 'Post oluşturulurken bir hata oluştu.',
                variant: 'destructive'
            });
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Görseli İndir (PNG - 1080 x 1350 px Ultra HD)
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
                scale: 2.0, // 540 x 675 -> 1080 x 1350 px (Instagram 4:5 tam dikey standardı)
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
            const suffix = selectedStyle === 'yazili_vakti' ? 'DinDersi_Atolyesi' : 'Doodle_Calisma_Notu';
            link.download = `${data.topicTitle.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '_')}_${suffix}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast({
                title: 'Çalışma Notu İndirildi! 🎉',
                description: 'Ultra net 1080x1350 px Instagram formatında başarıyla kaydedildi.',
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
                {/* Popüler Yuvarlak ve El Çizimi Fontları */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800;900&family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />

                {/* MODAL ÜST BARI */}
                <DialogHeader className="pb-2.5 border-b border-slate-800 flex-shrink-0 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-pink-900/30 flex-shrink-0 text-xl font-black">
                            {selectedStyle === 'yazili_vakti' ? '🕌' : '🪵'}
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                                <span>{data.topicTitle} • Instagram Çalışma Notu</span>
                                <Badge className="bg-pink-500/20 text-pink-300 border-pink-400/30 text-[10px] hidden sm:inline-flex">
                                    1080 x 1350 px (4:5)
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 truncate">
                                {selectedStyle === 'yazili_vakti' 
                                    ? 'DinDersi Atölyesi infografik şablonunda 6 kart, tablo ve cami illüstrasyonu' 
                                    : 'Türkçenin Pratiği / Ahşap Tabela & Doodle defter notu tasarımı'}
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* 🎨 Şablon Seçici Buton Grubu */}
                        <div className="flex items-center bg-slate-900 border border-slate-700 p-0.5 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setSelectedStyle('yazili_vakti')}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    selectedStyle === 'yazili_vakti'
                                        ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="DinDersi Atölyesi Şablonu (Cami, Rahle, Kubbe, 6 Kart & Tablo)"
                            >
                                <span>🕌</span>
                                <span className="hidden sm:inline">DinDersi Şablonu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStyle('doodle_calisma_notu')}
                                className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    selectedStyle === 'doodle_calisma_notu'
                                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Doodle Defter Şablonu (Ahşap Tabela, 💡🔍🔑 İkonları & Kalemlik)"
                            >
                                <span>🪵</span>
                                <span className="hidden sm:inline">Doodle Notu</span>
                            </button>
                        </div>

                        {/* 🤖 AI ile Bu Notu Doldur */}
                        <Button
                            size="sm"
                            disabled={isGeneratingAi}
                            onClick={handleGenerateAiCustomPost}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs h-9 px-3.5 shadow-md shadow-purple-950/40 flex items-center gap-1.5 cursor-pointer"
                            title="Bu notun içeriğini yapay zeka ile tara ve kartları tam bu nota özel doldur"
                        >
                            <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
                            <span className="hidden sm:inline">{isGeneratingAi ? 'Dolduruluyor...' : 'AI ile Özel Post Üret'}</span>
                        </Button>

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
                            className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 cursor-pointer"
                            title="Hazır Instagram Açıklama ve Etiketlerini Kopyala"
                        >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                            <span className="hidden sm:inline">{isCopied ? 'Kopyalandı' : 'Açıklama'}</span>
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
                            {/* GERÇEK ÇIKTI ALINACAK 540 x 675 PX (INSTAGRAM 4:5 ULTRA HD TUVAL) */}
                            {/* ═══════════════════════════════════════════════════════════════════ */}
                            <div
                                ref={captureRef}
                                className="w-[540px] h-[675px] bg-[#ffffff] rounded-xl shadow-xl overflow-hidden flex flex-col justify-between relative select-none p-3"
                                style={{
                                    fontFamily: "'Fredoka', 'Nunito', sans-serif",
                                    boxSizing: 'border-box',
                                    color: '#0f172a'
                                }}
                            >
                                {selectedStyle === 'yazili_vakti' ? (
                                    /* ═══════════════════════════════════════════════════════════════ */
                                    /* ŞABLON 1: YAZILI VAKTİ FORMATI (BİREBİR RESİM 2 & 3)          */
                                    /* ═══════════════════════════════════════════════════════════════ */
                                    <>
                                        {/* ══ 1. ÜST BAŞLIK ALANI ══ */}
                                        <div className="flex items-center justify-between relative flex-shrink-0 pt-0.5 pb-1">
                                            {/* Sol: Tilted Sarı Konuşma Balonu Çıkartması */}
                                            <div 
                                                className="bg-[#fde047] border-[2px] border-[#000000] rounded-2xl px-2.5 py-1 text-center shadow-xs transform -rotate-3 select-none flex-shrink-0"
                                                style={{ width: '105px' }}
                                            >
                                                <div className="text-[10px] font-black leading-tight text-[#000000] whitespace-pre-line">
                                                    {data.gradeTag}
                                                </div>
                                            </div>

                                            {/* Orta: DinDersi Atölyesi ve Ünite Başlığı */}
                                            <div className="flex flex-col items-center text-center relative z-10 flex-1 px-1">
                                                <div className="text-[20px] font-black tracking-tight text-[#0f172a] leading-none mb-0.5 flex items-center gap-1.5 drop-shadow-xs whitespace-nowrap">
                                                    <span className="text-pink-500 text-sm">✨</span>
                                                    <span className="tracking-tight">{data.brandTitle || 'DinDersi Atölyesi'}</span>
                                                    <span className="text-pink-500 text-sm">✨</span>
                                                </div>

                                                {/* Ünite Numarası Mor Hapı */}
                                                <div className="bg-[#f3e8ff] border-[1.5px] border-[#a855f7] text-[#6b21a8] text-[9.5px] font-black px-3 py-0.2 rounded-full uppercase tracking-wider mb-0.5">
                                                    {data.unitTag}
                                                </div>

                                                {/* Konu Başlığı Mavi Hapı (Yanlarında Pembe Işın Okları) */}
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
                                            {/* KART 1: Sol Üst - Mavi Kart (4 Madde, Pembe Noktalar + Mescid Kubbesi) */}
                                            <div className="border-[2px] border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 relative flex flex-col justify-between">
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bae6fd] border-[2px] border-[#0284c7] text-[#0369a1] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                    {data.card1.title}
                                                </div>
                                                <div className="flex items-center justify-between gap-1 mt-2.5">
                                                    <div className="space-y-1 flex-1">
                                                        {data.card1.bullets.map((b, i) => (
                                                            <div key={i} className="text-[8.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1">
                                                                <span className="text-[#ec4899] text-xs font-black flex-shrink-0">•</span>
                                                                <span>{b}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="w-10 h-10 flex-shrink-0 self-end">
                                                        <svg viewBox="0 0 70 70" className="w-10 h-10" fill="none">
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

                                            {/* KART 2: Sağ Üst - Sarı Kart (5 Kavram, Renkli Onay İşaretleri) */}
                                            <div className="border-[2px] border-[#facc15] bg-[#fefce8] rounded-2xl p-2 relative flex flex-col justify-between">
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fef08a] border-[2px] border-[#ca8a04] text-[#854d0e] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                    {data.card2.title}
                                                </div>
                                                <div className="space-y-1 mt-2.5">
                                                    {data.card2.items.map((it, i) => (
                                                        <div key={i} className="text-[8.5px] font-semibold text-[#1e293b] leading-[1.2] flex items-start gap-1">
                                                            <span className="text-xs font-black flex-shrink-0" style={{ color: it.color || '#16a34a' }}>✔</span>
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
                                            {/* KART 3: Sol Orta - Pembe Kart (6 Numaralı Madde, Pembe Rozetler) */}
                                            <div className="border-[2px] border-[#f472b6] bg-[#fdf2f8] rounded-2xl p-2 relative flex flex-col justify-between">
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fbcfe8] border-[2px] border-[#db2777] text-[#9d174d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                    {data.card3.title}
                                                </div>
                                                <div className="space-y-1 mt-2.5">
                                                    {data.card3.items.map((it, i) => (
                                                        <div key={i} className="text-[8.5px] font-semibold text-[#1e293b] leading-[1.2] flex items-start gap-1">
                                                            <div className="w-3.5 h-3.5 rounded-full bg-[#ec4899] text-white flex items-center justify-center text-[8.5px] font-black flex-shrink-0 mt-0.5">
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

                                            {/* KART 4: Sağ Orta - Mavi Kart (2 Alt Bölümlü, Rahle & Yaprak) */}
                                            <div className="border-[2px] border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 relative flex flex-col justify-between">
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bae6fd] border-[2px] border-[#0284c7] text-[#0369a1] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                    {data.card4.title}
                                                </div>
                                                <div className="mt-2.5 space-y-1.5">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div>
                                                            <div className="bg-[#fef08a] border border-[#ca8a04] text-[#854d0e] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-0.5">
                                                                {data.card4.sub1Title}
                                                            </div>
                                                            <p className="text-[8.5px] font-semibold text-[#334155] leading-[1.2]">
                                                                ➔ {data.card4.sub1Text}
                                                            </p>
                                                        </div>
                                                        <div className="w-9 h-7 flex-shrink-0">
                                                            <svg viewBox="0 0 70 55" className="w-9 h-7" fill="none">
                                                                <path d="M15 50 L45 30 L55 50 M55 50 L25 30 L15 50" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
                                                                <path d="M12 28 Q35 34 35 38 Q35 34 58 28 L55 12 Q35 18 35 20 Q35 18 15 12 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                                                <line x1="20" y1="18" x2="30" y2="21" stroke="#cbd5e1" strokeWidth="1" />
                                                                <line x1="40" y1="21" x2="50" y2="18" stroke="#cbd5e1" strokeWidth="1" />
                                                            </svg>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="bg-[#ede9fe] border border-[#8b5cf6] text-[#6b21a8] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-0.5">
                                                            {data.card4.sub2Title}
                                                        </div>
                                                        <div className="flex items-end justify-between">
                                                            <div className="space-y-0.5 flex-1">
                                                                {data.card4.sub2Bullets.map((b, i) => (
                                                                    <div key={i} className="text-[8px] font-semibold text-[#334155] leading-[1.2] flex items-start gap-1">
                                                                        <span className="text-emerald-600 font-black text-xs">✔</span>
                                                                        <span>{b}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="w-5 h-5 flex-shrink-0">
                                                                <svg viewBox="0 0 30 30" className="w-5 h-5" fill="none">
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
                                            {/* KART 5: Sol Alt - Yeşil Kart (2 Madde + 4 Kitap Yığını) */}
                                            <div className="border-[2px] border-[#4ade80] bg-[#f0fdf4] rounded-2xl p-2 relative flex flex-col justify-between">
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bbf7d0] border-[2px] border-[#16a34a] text-[#14532d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                    {data.card5.title}
                                                </div>
                                                <div className="flex items-center justify-between gap-1 mt-2.5">
                                                    <div className="space-y-1 flex-1">
                                                        {data.card5.bullets.map((b, i) => (
                                                            <div key={i} className="text-[8.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1">
                                                                <span className="text-emerald-600 font-black text-xs">✔</span>
                                                                <span>{b}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="w-12 h-12 flex-shrink-0">
                                                        <svg viewBox="0 0 75 75" className="w-12 h-12" fill="none">
                                                            <rect x="15" y="14" width="48" height="11" rx="2" fill="#1d4ed8" stroke="#000000" strokeWidth="1.5" />
                                                            <text x="39" y="22" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Özet Not</text>
                                                            <rect x="12" y="27" width="52" height="11" rx="2" fill="#c2410c" stroke="#000000" strokeWidth="1.5" />
                                                            <text x="38" y="35" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Kilit Bilgi</text>
                                                            <rect x="15" y="40" width="50" height="11" rx="2" fill="#b91c1c" stroke="#000000" strokeWidth="1.5" />
                                                            <text x="40" y="48" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Sınav İpucu</text>
                                                            <rect x="10" y="53" width="56" height="12" rx="2" fill="#15803d" stroke="#000000" strokeWidth="1.5" />
                                                            <text x="38" y="62" fill="#ffffff" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Din Kültürü</text>
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* KART 6: Sağ Alt - Pembe Kart (2 Sütunlu Pastel Tablo) */}
                                            <div className="border-[2px] border-[#f472b6] bg-[#fdf2f8] rounded-2xl p-1.5 relative flex flex-col justify-between">
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fbcfe8] border-[2px] border-[#db2777] text-[#9d174d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                    {data.card6.title}
                                                </div>
                                                <div className="mt-2.5 overflow-hidden rounded-xl border border-[#cbd5e1]">
                                                    <table className="w-full border-collapse">
                                                        <thead>
                                                            <tr className="bg-[#fef08a] text-[9px] font-black text-[#854d0e]">
                                                                <th className="py-1 px-1 border-r border-[#cbd5e1] w-[32%] text-center">{data.card6.col1Header}</th>
                                                                <th className="py-1 px-1.5 w-[68%] text-left">{data.card6.col2Header}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="text-[8px] font-semibold text-[#1e293b]">
                                                            {data.card6.rows.map((r, i) => (
                                                                <tr key={i} style={{ background: r.bg || '#e0f2fe' }} className="border-t border-[#cbd5e1]">
                                                                    <td className="py-1 px-1 border-r border-[#cbd5e1] font-black text-[8.5px] text-center leading-tight">{r.col1}</td>
                                                                    <td className="py-1 px-1.5 leading-tight text-left">{r.col2}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ══ 5. SATIR 4: UNUTMA! ŞERİDİ (TAM EN ALT KUTUSU) ══ */}
                                        <div className="border-[2px] border-dashed border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 flex items-center justify-between gap-2 my-0.5">
                                            <div className="bg-[#fde047] border-[2px] border-[#000000] rounded-xl px-3 py-1 shadow-xs transform -rotate-3 select-none flex-shrink-0">
                                                <span className="text-[14px] font-black text-[#000000] tracking-tight">Unutma!</span>
                                            </div>

                                            <div className="space-y-0.5 flex-1 px-1">
                                                {data.unutmaBullets.map((b, i) => (
                                                    <div key={i} className="text-[8.5px] font-bold text-[#1e293b] leading-[1.25] flex items-start gap-1.5">
                                                        <span className="text-emerald-600 font-black text-xs">✔</span>
                                                        <span>{b}</span>
                                                    </div>
                                                ))}
                                            </div>

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
                                            <span className="bg-[#ede9fe] text-[#7c3aed] text-[9.5px] font-black px-2.5 py-0.5 rounded-full border border-[#c4b5fd] flex items-center gap-1 shadow-xs">
                                                <span>@dindersiatolyesi</span>
                                                <span className="text-pink-500 text-[10px]">✨</span>
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    /* ═══════════════════════════════════════════════════════════════ */
                                    /* ŞABLON 2: DOODLE ÇALIŞMA NOTU FORMATI (BİREBİR RESİM 1)        */
                                    /* ═══════════════════════════════════════════════════════════════ */
                                    <>
                                        {/* ══ 1. ÜST AHŞAP TABELA VE DOODLE BAŞLIK ══ */}
                                        <div className="flex items-center justify-between relative flex-shrink-0 pt-0.5 pb-1 gap-2">
                                            {/* Sol: Sevimli Açık Defter Doodle (SVG) */}
                                            <div className="w-14 h-12 flex-shrink-0 select-none">
                                                <svg viewBox="0 0 80 65" className="w-full h-full" fill="none">
                                                    <path d="M6 48 Q40 54 40 57 Q40 54 74 48 L76 14 Q40 20 40 24 Q40 20 4 14 Z" fill="#0284c7" stroke="#000000" strokeWidth="2" />
                                                    <path d="M8 44 Q40 50 40 52 L40 18 Q40 16 8 10 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                                    <path d="M72 44 Q40 50 40 52 L40 18 Q40 16 72 10 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                                    <line x1="14" y1="18" x2="34" y2="22" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                    <line x1="14" y1="26" x2="34" y2="30" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                    <line x1="14" y1="34" x2="30" y2="38" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                    <line x1="46" y1="22" x2="66" y2="18" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                    <line x1="46" y1="30" x2="66" y2="26" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                    <line x1="46" y1="38" x2="62" y2="34" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path d="M38 18 L38 56 L41 51 L44 56 L44 18 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="0.8" />
                                                </svg>
                                            </div>

                                            {/* Orta: Ahşap Tabela Konteyneri */}
                                            <div className="relative flex items-center justify-center flex-1 max-w-[340px]">
                                                <div 
                                                    className="w-full bg-[#d97706] border-[2.5px] border-[#78350f] rounded-2xl py-1.5 px-3 text-center shadow-md relative overflow-hidden"
                                                    style={{
                                                        background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.3)'
                                                    }}
                                                >
                                                    {/* Ahşap Çizgileri */}
                                                    <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
                                                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 7px, #78350f 8px, transparent 9px)'
                                                    }} />
                                                    {/* 4 Köşedeki Vidalar */}
                                                    <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-[#78350f] border border-[#fef3c7] flex items-center justify-center text-[6px] text-[#fef3c7] font-black">+</div>
                                                    <div className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#78350f] border border-[#fef3c7] flex items-center justify-center text-[6px] text-[#fef3c7] font-black">+</div>
                                                    <div className="absolute bottom-1 left-2 w-2 h-2 rounded-full bg-[#78350f] border border-[#fef3c7] flex items-center justify-center text-[6px] text-[#fef3c7] font-black">+</div>
                                                    <div className="absolute bottom-1 right-2 w-2 h-2 rounded-full bg-[#78350f] border border-[#fef3c7] flex items-center justify-center text-[6px] text-[#fef3c7] font-black">+</div>

                                                    <div className="relative z-10">
                                                        <div className="text-[13px] font-black tracking-tight text-[#451a03] leading-none drop-shadow-xs">
                                                            {data.gradeTag.replace(/\n/g, ' ')}
                                                        </div>
                                                        <div className="text-[12px] font-black text-[#451a03] leading-tight mt-0.5 truncate">
                                                            {data.topicTitle}
                                                        </div>
                                                        {/* Sarı Kıvrımlı Çalışma Notu Bandı */}
                                                        <div className="mt-1 inline-block bg-[#fde047] border-[1.5px] border-[#000000] text-[#000000] text-[10.5px] font-black px-4 py-0.2 rounded-full shadow-xs">
                                                            Çalışma Notu
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sağ: Sevimli Sarı Kurşun Kalem Doodle (SVG) */}
                                            <div className="w-12 h-12 flex-shrink-0 select-none">
                                                <svg viewBox="0 0 65 65" className="w-full h-full transform rotate-12" fill="none">
                                                    <rect x="25" y="16" width="14" height="34" fill="#facc15" stroke="#000000" strokeWidth="2" />
                                                    <line x1="30" y1="16" x2="30" y2="50" stroke="#ca8a04" strokeWidth="1.5" />
                                                    <line x1="34" y1="16" x2="34" y2="50" stroke="#ca8a04" strokeWidth="1.5" />
                                                    <rect x="25" y="6" width="14" height="10" rx="3" fill="#f472b6" stroke="#000000" strokeWidth="2" />
                                                    <rect x="24" y="13" width="16" height="4" fill="#cbd5e1" stroke="#000000" strokeWidth="1.5" />
                                                    <polygon points="25,50 39,50 32,62" fill="#fde68a" stroke="#000000" strokeWidth="2" />
                                                    <polygon points="30,58 34,58 32,62" fill="#000000" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* ══ 2. İKİ SÜTUNLU DOODLE GÖVDE (TAM 7 BÖLÜM) ══ */}
                                        <div className="grid grid-cols-2 gap-2 my-0.5 flex-1">
                                            {/* SOL SÜTUN (KART 1, 2, 3, 4) */}
                                            <div className="flex flex-col gap-1.5 justify-between">
                                                {/* KART 1: 💡 Pembe Kutu (Nasıl Yapılır / İpucu) */}
                                                <div className="border-[1.5px] border-[#f472b6] bg-[#fff1f2] rounded-xl p-1.5 relative">
                                                    <div className="bg-[#fce7f3] border border-[#ec4899] text-[#be185d] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-1 flex items-center gap-1">
                                                        <span>💡</span>
                                                        <span className="truncate max-w-[180px]">1. {data.card1.title}</span>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <span className="bg-[#fbcfe8] text-[#9d174d] text-[7.5px] font-black px-1.5 py-0.1 rounded inline-block">Nasıl Yapılır?</span>
                                                        <p className="text-[8.5px] font-semibold text-[#1e293b] leading-tight">
                                                            {data.card1.bullets[0] || 'Konunun ana mesajı ve ayet mealleri dikkatlice incelenir.'}
                                                        </p>
                                                        <div className="flex items-start gap-1 pt-0.5">
                                                            <span className="text-emerald-600 font-black text-[9px]">✔</span>
                                                            <p className="text-[8px] font-bold text-[#334155] leading-tight">
                                                                <span className="text-[#be185d]">İpucu:</span> {data.card1.bullets[1] || 'Soru kökündeki kavramlara odaklan.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* KART 2: 🔍 Turuncu Kutu (Kavramlar ve Örnek) */}
                                                <div className="border-[1.5px] border-[#fb923c] bg-[#fff7ed] rounded-xl p-1.5 relative">
                                                    <div className="bg-[#ffedd5] border border-[#f97316] text-[#c2410c] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-1 flex items-center gap-1">
                                                        <span>🔍</span>
                                                        <span className="truncate max-w-[180px]">2. {data.card2.title}</span>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <span className="bg-[#fed7aa] text-[#9a3412] text-[7.5px] font-black px-1.5 py-0.1 rounded inline-block">Nasıl Yapılır?</span>
                                                        <p className="text-[8.5px] font-semibold text-[#1e293b] leading-tight">
                                                            {data.card2.items[0]?.term ? `${data.card2.items[0].term}: ${data.card2.items[0].desc}` : 'Kavramların sözlük ve terim anlamları ayırt edilir.'}
                                                        </p>
                                                        <div className="flex items-start gap-1 pt-0.5">
                                                            <span className="text-[#ea580c] font-black text-[9px]">➔</span>
                                                            <p className="text-[8px] font-bold text-[#334155] leading-tight">
                                                                <span className="text-[#c2410c]">Örnek:</span> {data.card2.items[1]?.term ? `${data.card2.items[1].term} (${data.card2.items[1].desc})` : 'Tevhid inancı temel esastır.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* KART 3: 🖼️ Yeşil Kutu (Görsel ve Dikkat Edilecekler) */}
                                                <div className="border-[1.5px] border-[#4ade80] bg-[#f0fdf4] rounded-xl p-1.5 relative">
                                                    <div className="bg-[#dcfce7] border border-[#22c55e] text-[#15803d] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-1 flex items-center gap-1">
                                                        <span>🖼️</span>
                                                        <span className="truncate max-w-[180px]">3. Dikkat Edilecekler</span>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <span className="bg-[#bbf7d0] text-[#166534] text-[7.5px] font-black px-1.5 py-0.1 rounded inline-block">Nasıl Yapılır?</span>
                                                        <p className="text-[8.5px] font-semibold text-[#1e293b] leading-tight">
                                                            {data.card5.bullets[0] || 'Olayların ve emirlerin sebep-sonuç ilişkisi kavranmalıdır.'}
                                                        </p>
                                                        <div className="flex items-start gap-1 pt-0.5">
                                                            <span className="text-amber-500 font-black text-[9px]">★</span>
                                                            <p className="text-[8px] font-bold text-[#334155] leading-tight">
                                                                <span className="text-[#15803d]">Dikkat:</span> {data.card5.bullets[1] || 'Soru kökünde olumsuz ifadelere dikkat et.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* KART 4: 🔑 Sarı Kutu (Anahtar Kelimeler) */}
                                                <div className="border-[1.5px] border-[#facc15] bg-[#fefce8] rounded-xl p-1.5 relative">
                                                    <div className="bg-[#fef08a] border border-[#eab308] text-[#854d0e] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-1 flex items-center gap-1">
                                                        <span>🔑</span>
                                                        <span className="truncate max-w-[180px]">4. Anahtar Bilgiler</span>
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <span className="bg-[#fef08a] text-[#854d0e] text-[7.5px] font-black px-1.5 py-0.1 rounded inline-block">Nedir?</span>
                                                        <p className="text-[8.5px] font-semibold text-[#1e293b] leading-tight">
                                                            {data.card4.sub1Text}
                                                        </p>
                                                        <div className="flex items-start gap-1 pt-0.5">
                                                            <span className="text-emerald-600 font-black text-[9px]">✔</span>
                                                            <p className="text-[8px] font-bold text-[#334155] leading-tight">
                                                                <span className="text-[#854d0e]">Örnek:</span> {data.card4.sub2Bullets[0] || 'İslam ahlakını davranışlara yansıtmak.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SAĞ SÜTUN (KART 5, 6, 7) */}
                                            <div className="flex flex-col gap-1.5 justify-between">
                                                {/* KART 5: 📖 Mavi Kutu (Kavramlar ve Anlamları - 4 Renkli Onay) */}
                                                <div className="border-[1.5px] border-[#38bdf8] bg-[#f0f9ff] rounded-xl p-1.5 relative">
                                                    <div className="bg-[#e0f2fe] border border-[#0284c7] text-[#0369a1] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-1 flex items-center gap-1">
                                                        <span>📖</span>
                                                        <span className="truncate max-w-[180px]">5. Kilit Kavramlar ve Anlamları</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {(data.card2.items.slice(0, 4)).map((it, i) => (
                                                            <div key={i} className="text-[8.5px] font-semibold text-[#1e293b] leading-tight flex items-start gap-1">
                                                                <span className="text-xs font-black flex-shrink-0" style={{ color: it.color || '#16a34a' }}>✔</span>
                                                                <div>
                                                                    <strong className="text-[#0f172a] font-black">{it.term}:</strong>{' '}
                                                                    <span className="text-[#334155]">{it.desc}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* KART 6: ✏️ Mor Kutu (Esaslar ve İlkeler - 3 Madde) */}
                                                <div className="border-[1.5px] border-[#a855f7] bg-[#faf5ff] rounded-xl p-1.5 relative">
                                                    <div className="bg-[#f3e8ff] border border-[#9333ea] text-[#6b21a8] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-1 flex items-center gap-1">
                                                        <span>✏️</span>
                                                        <span className="truncate max-w-[180px]">6. {data.card3.title}</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {(data.card3.items.slice(0, 3)).map((it, i) => (
                                                            <div key={i} className="text-[8.5px] font-semibold text-[#1e293b] leading-tight flex items-start gap-1">
                                                                <div className="w-3.5 h-3.5 rounded-full bg-[#a855f7] text-white flex items-center justify-center text-[8px] font-black flex-shrink-0 mt-0.5">
                                                                    {it.num}
                                                                </div>
                                                                <div>
                                                                    <strong className="text-[#0f172a] font-black">{it.term}:</strong>{' '}
                                                                    <span className="text-[#334155]">{it.desc}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* KART 7: ⭐ Amber/Gold Kutu (Yazılı Taktikleri & 3 Renkli Mini Kutu) */}
                                                <div className="border-[1.5px] border-[#d97706] bg-[#fffbeb] rounded-xl p-1.5 relative">
                                                    <div className="bg-[#fef3c7] border border-[#d97706] text-[#92400e] text-[8.5px] font-black px-2 py-0.2 rounded-full w-fit mb-1 flex items-center gap-1">
                                                        <span>⭐</span>
                                                        <span className="truncate max-w-[180px]">7. Altın Sınav Kuralları</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {/* Alt Kutu 1: Sarı (Yazım/İsim Kuralları) */}
                                                        <div className="bg-[#fef9c3] border border-[#fde047] rounded-lg p-1 text-[8px] leading-tight">
                                                            <div className="font-black text-[#854d0e] flex items-center gap-1">
                                                                <span>⭐</span>
                                                                <span>Büyük Harf & Saygı İfadeleri:</span>
                                                            </div>
                                                            <div className="text-[#451a03] font-semibold">
                                                                Allah, Peygamber, Sure ve Kitap adları büyük harfle başlar.
                                                            </div>
                                                        </div>

                                                        {/* Alt Kutu 2: Pembe (Tuzak & Hata Uyarısı) */}
                                                        <div className="bg-[#fce7f3] border border-[#f472b6] rounded-lg p-1 text-[8px] leading-tight">
                                                            <div className="font-black text-[#9d174d] flex items-center gap-1">
                                                                <span>🔴</span>
                                                                <span>Sık Yapılan Hata:</span>
                                                            </div>
                                                            <div className="text-[#831843] font-semibold">
                                                                {data.unutmaBullets[0] || 'Kavramları ve tanımları birbiriyle karıştırma.'}
                                                            </div>
                                                        </div>

                                                        {/* Alt Kutu 3: Yeşil (Soru Çözüm Püf Noktası) */}
                                                        <div className="bg-[#dcfce7] border border-[#86efac] rounded-lg p-1 text-[8px] leading-tight">
                                                            <div className="font-black text-[#166534] flex items-center gap-1">
                                                                <span>🟢</span>
                                                                <span>Soru Çözüm Taktiği:</span>
                                                            </div>
                                                            <div className="text-[#14532d] font-semibold">
                                                                {data.unutmaBullets[1] || 'Soru kökündeki anahtar kelimelere odaklan.'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ══ 3. ALT BULUT BANNER, KİTAP YIĞINI VE KALEMLİK (TAM RESİM 1 GİBİ) ══ */}
                                        <div className="flex items-center justify-between relative flex-shrink-0 pt-0.5 border-t border-[#cbd5e1] gap-2">
                                            {/* Sol: Kitap Yığını (SVG) */}
                                            <div className="w-12 h-10 flex-shrink-0 select-none">
                                                <svg viewBox="0 0 65 50" className="w-full h-full" fill="none">
                                                    <rect x="6" y="32" width="52" height="11" rx="2" fill="#0284c7" stroke="#000000" strokeWidth="1.5" />
                                                    <rect x="10" y="21" width="46" height="11" rx="2" fill="#ea580c" stroke="#000000" strokeWidth="1.5" />
                                                    <rect x="14" y="10" width="40" height="11" rx="2" fill="#16a34a" stroke="#000000" strokeWidth="1.5" />
                                                </svg>
                                            </div>

                                            {/* Orta: Mor Dalgalı Bulut Ribbon */}
                                            <div className="bg-[#ede9fe] border-[2px] border-[#a855f7] rounded-full px-5 py-1 text-center shadow-xs flex-1">
                                                <span className="text-[13px] font-black text-[#6b21a8] tracking-tight">
                                                    {data.brandTitle || 'DinDersi Atölyesi'}
                                                </span>
                                            </div>

                                            {/* Sağ: Renkli Kalemlik & Cetvel (SVG) */}
                                            <div className="w-10 h-10 flex-shrink-0 select-none">
                                                <svg viewBox="0 0 50 50" className="w-full h-full" fill="none">
                                                    <rect x="12" y="22" width="26" height="24" rx="3" fill="#fb923c" stroke="#000000" strokeWidth="1.5" />
                                                    <line x1="18" y1="22" x2="14" y2="6" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                                                    <line x1="25" y1="22" x2="25" y2="4" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
                                                    <line x1="32" y1="22" x2="36" y2="8" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
                                                    <rect x="22" y="6" width="6" height="16" fill="#fde047" stroke="#000000" strokeWidth="1" />
                                                </svg>
                                            </div>
                                        </div>
                                    </>
                                )}
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
                                        onClick={() => setData(initialData)}
                                        className="h-7 text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                        title="Orijinal içeriğe geri dön"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Sıfırla
                                    </Button>
                                </div>

                                {/* Üst Başlıklar */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Üst Marka / Logo Başlığı:</label>
                                    <input 
                                        type="text"
                                        value={data.brandTitle || 'DinDersi Atölyesi'}
                                        onChange={e => setData(prev => ({ ...prev, brandTitle: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                    />
                                </div>

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
                                    <label className="font-bold text-slate-300">Sol Üst Rozet (Sınıf & Ders):</label>
                                    <textarea 
                                        rows={2}
                                        value={data.gradeTag}
                                        onChange={e => setData(prev => ({ ...prev, gradeTag: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold"
                                    />
                                </div>

                                {/* Kart 1 Başlık & Maddeler */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-800">
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
                                <div className="space-y-1.5 pt-2 border-t border-slate-800">
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

                                {/* Kart 3 Numaralı Maddeler */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-pink-300 block">3. Kart (Pembe Numaralı): {data.card3.title}</label>
                                    <input 
                                        type="text"
                                        value={data.card3.title}
                                        onChange={e => setData(prev => ({ ...prev, card3: { ...prev.card3, title: e.target.value } }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold mb-1"
                                    />
                                    {data.card3.items.map((it, i) => (
                                        <div key={i} className="flex gap-1.5 mb-1">
                                            <input 
                                                type="text"
                                                value={it.term}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setData(prev => {
                                                        const next = [...prev.card3.items];
                                                        next[i] = { ...next[i], term: val };
                                                        return { ...prev, card3: { ...prev.card3, items: next } };
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
                                                        const next = [...prev.card3.items];
                                                        next[i] = { ...next[i], desc: val };
                                                        return { ...prev, card3: { ...prev.card3, items: next } };
                                                    });
                                                }}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Kart 6 Tablo Satırları */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-purple-300 block">6. Kart (Eşleştirme Tablosu): {data.card6.title}</label>
                                    {data.card6.rows.map((r, i) => (
                                        <div key={i} className="flex gap-1.5 mb-1">
                                            <input 
                                                type="text"
                                                value={r.col1}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setData(prev => {
                                                        const next = [...prev.card6.rows];
                                                        next[i] = { ...next[i], col1: val };
                                                        return { ...prev, card6: { ...prev.card6, rows: next } };
                                                    });
                                                }}
                                                className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold text-[11px]"
                                            />
                                            <input 
                                                type="text"
                                                value={r.col2}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setData(prev => {
                                                        const next = [...prev.card6.rows];
                                                        next[i] = { ...next[i], col2: val };
                                                        return { ...prev, card6: { ...prev.card6, rows: next } };
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
                                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 max-h-52 overflow-y-auto text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-wrap select-text scrollbar-thin">
                                        {captionText}
                                    </div>
                                </div>

                                {/* Bilgi Kartı */}
                                <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-3 text-xs text-pink-200 space-y-1.5">
                                    <div className="font-extrabold flex items-center gap-1.5 text-pink-300">
                                        <Wand2 className="w-4 h-4 text-pink-400" />
                                        <span>DinDersi Atölyesi İnfografik Tasarımı</span>
                                    </div>
                                    <p className="text-[11.5px] leading-relaxed text-pink-100/90">
                                        Pedagojik ders çalışma notu formatında <strong>{data.brandTitle || 'DinDersi Atölyesi'}</strong> başlığı, sol konuşma balonu, sevimli cami, Mescid-i Nebevi yeşil kubbesi, renkli onay işaretleri, 6 pembe numaralı rozet, kavram tablosu ve alt <strong>Unutma!</strong> kutusu konuya özel olarak kurgulanmıştır.
                                    </p>
                                    <div className="pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleGenerateAiCustomPost}
                                            disabled={isGeneratingAi}
                                            className="w-full h-7 text-xs bg-pink-950/60 border-pink-500/40 text-pink-200 hover:bg-pink-900 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <Sparkles className="w-3 h-3 text-amber-300" />
                                            <span>{isGeneratingAi ? 'Yapay Zeka Taranıyor...' : 'AI ile Bu Notu Yeniden Şekillendir'}</span>
                                        </Button>
                                    </div>
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
