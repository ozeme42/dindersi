'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Instagram, Download, Copy, Check, ChevronLeft, ChevronRight, 
    Sparkles, Layers, Loader2, Palette, Edit3, RotateCcw, Eye
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

export type InstagramTheme = 'sunset' | 'emerald' | 'dark';

export interface InstagramConcept {
    term: string;
    definition: string;
}

export interface InstagramKeyPoint {
    title: string;
    text: string;
}

export interface InstagramTip {
    title: string;
    text: string;
    type: 'warning' | 'tip' | 'note';
}

export interface InstagramData {
    gradeBadge: string;
    unitName: string;
    title: string;
    hook: string;
    featurePills: string[];
    concepts: InstagramConcept[];
    keyPoints: InstagramKeyPoint[];
    criticalTips: InstagramTip[];
}

// ══ ŞIK INSTAGRAM TEMALARI (4:5 Boyutuna Özel) ══
interface ThemeConfig {
    id: InstagramTheme;
    name: string;
    icon: string;
    bgStyle: string;
    canvasBg: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accentGradient: string;
    accentSolid: string;
    badgeBg: string;
    badgeText: string;
    cardBg: string;
    cardBorder: string;
    cardShadow: string;
    barBg: string;
    barBorder: string;
    barText: string;
    pillBg: string;
    pillBorder: string;
    pillText: string;
    glowColor: string;
}

const THEMES: Record<InstagramTheme, ThemeConfig> = {
    sunset: {
        id: 'sunset',
        name: 'Instagram Sunset',
        icon: '🎨',
        bgStyle: 'linear-gradient(155deg, #ffffff 0%, #fff7ed 35%, #fdf2f8 70%, #ffffff 100%)',
        canvasBg: '#ffffff',
        textPrimary: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        accentGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 40%, #ea580c 100%)',
        accentSolid: '#e11d48',
        badgeBg: 'linear-gradient(135deg, #e11d48 0%, #ea580c 100%)',
        badgeText: '#ffffff',
        cardBg: '#ffffff',
        cardBorder: '#ffe4e6',
        cardShadow: '0 4px 14px -2px rgba(225, 29, 72, 0.08), 0 1px 3px rgba(0,0,0,0.03)',
        barBg: 'rgba(255, 255, 255, 0.95)',
        barBorder: '#f1f5f9',
        barText: '#0f172a',
        pillBg: '#fff1f2',
        pillBorder: '#fecdd3',
        pillText: '#e11d48',
        glowColor: 'rgba(225, 29, 72, 0.15)',
    },
    emerald: {
        id: 'emerald',
        name: 'Zümrüt Prestige',
        icon: '💎',
        bgStyle: 'linear-gradient(155deg, #ffffff 0%, #f0fdf4 35%, #ecfdf5 70%, #ffffff 100%)',
        canvasBg: '#ffffff',
        textPrimary: '#064e3b',
        textSecondary: '#065f46',
        textMuted: '#047857',
        accentGradient: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #d97706 100%)',
        accentSolid: '#059669',
        badgeBg: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
        badgeText: '#ffffff',
        cardBg: '#ffffff',
        cardBorder: '#d1fae5',
        cardShadow: '0 4px 14px -2px rgba(5, 150, 105, 0.1), 0 1px 3px rgba(0,0,0,0.03)',
        barBg: 'rgba(255, 255, 255, 0.95)',
        barBorder: '#e2e8f0',
        barText: '#064e3b',
        pillBg: '#ecfdf5',
        pillBorder: '#a7f3d0',
        pillText: '#047857',
        glowColor: 'rgba(5, 150, 105, 0.15)',
    },
    dark: {
        id: 'dark',
        name: 'Gece VIP',
        icon: '🌙',
        bgStyle: 'linear-gradient(155deg, #090d16 0%, #0f172a 45%, #1e1b4b 100%)',
        canvasBg: '#090d16',
        textPrimary: '#ffffff',
        textSecondary: '#e2e8f0',
        textMuted: '#94a3b8',
        accentGradient: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
        accentSolid: '#c084fc',
        badgeBg: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        badgeText: '#ffffff',
        cardBg: 'rgba(15, 23, 42, 0.75)',
        cardBorder: 'rgba(255, 255, 255, 0.1)',
        cardShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0,0,0,0.2)',
        barBg: 'rgba(15, 23, 42, 0.85)',
        barBorder: 'rgba(255, 255, 255, 0.08)',
        barText: '#ffffff',
        pillBg: 'rgba(99, 102, 241, 0.15)',
        pillBorder: 'rgba(168, 85, 247, 0.35)',
        pillText: '#e0e7ff',
        glowColor: 'rgba(168, 85, 247, 0.25)',
    }
};

/**
 * Mevcut HTML veya metinden bağımsız olarak, sadece anlamsal veriyi ayıklar.
 * Ham HTML etiketlerini asla slayta basmaz; temiz, yapısal veri üretir.
 */
function extractStructuredInstagramData(
    htmlContent: string,
    rawTitle: string,
    grade?: string,
    courseName?: string,
    unitName?: string,
    sourceText?: string
): InstagramData {
    // 1. Temiz Başlık
    let title = (rawTitle || 'Ders Notu')
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

    // Başlığı HTML içinden daha kaliteli al
    if (doc) {
        const h1 = doc.querySelector('h1, .title-banner, .unit-banner');
        if (h1 && h1.textContent?.trim()) {
            const cleanH1 = h1.textContent.trim().replace(/^\d+[\.\-\s]+/, '');
            if (cleanH1.length > 3 && cleanH1.length < 55) {
                title = cleanH1;
            }
        }
    }

    // 2. Sınıf ve Ünite Rozetleri
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
    const gradeBadge = detectedGrade 
        ? (detectedGrade === '8' ? `★ 8. Sınıf LGS` : `★ ${detectedGrade}. Sınıf Din Kültürü`) 
        : (courseName || '★ Din Kültürü ve Ahlak Bilgisi');

    const cleanUnit = (unitName || '')
        .replace(/^\d+[\.\-\s]+/, '')
        .trim() || 'MEB Müfredatı';

    // 3. Kavramları Ayıkla
    const rawConcepts: InstagramConcept[] = [];

    if (doc) {
        // A) .concept-card, .concept-item
        doc.querySelectorAll('.concept-card, .concept-item, .box-yellow .card').forEach(el => {
            const termEl = el.querySelector('.concept-badge, .c-tag, strong, h3, h4');
            const defEl = el.querySelector('p, .concept-text');
            const term = termEl?.textContent?.trim().replace(/[\:\-]$/, '') || '';
            let def = defEl?.textContent?.trim() || '';
            if (term && def.startsWith(term)) {
                def = def.slice(term.length).replace(/^[\:\-\s]+/, '').trim();
            }
            if (term && term.length >= 2 && term.length <= 35 && def.length >= 8) {
                rawConcepts.push({ term, definition: def.slice(0, 140) });
            }
        });

        // B) Tablo satırları
        if (rawConcepts.length < 3) {
            doc.querySelectorAll('table tbody tr').forEach(tr => {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 2) {
                    const term = tds[0].textContent?.trim().replace(/[\:\-]$/, '') || '';
                    const def = tds[1].textContent?.trim() || '';
                    if (term && term.length >= 2 && term.length <= 35 && def.length >= 8) {
                        rawConcepts.push({ term, definition: def.slice(0, 140) });
                    }
                }
            });
        }

        // C) Kalın terim + açıklama paragrafları
        if (rawConcepts.length < 3) {
            doc.querySelectorAll('p, li').forEach(p => {
                const s = p.querySelector('strong');
                if (s && s.textContent) {
                    const term = s.textContent.trim().replace(/[\:\-]$/, '');
                    const full = p.textContent?.trim() || '';
                    let def = full.replace(term, '').replace(/^[\:\-\s]+/, '').trim();
                    if (term.length >= 2 && term.length <= 30 && def.length >= 10 && def.length <= 150) {
                        if (!rawConcepts.some(c => c.term.toLowerCase() === term.toLowerCase())) {
                            rawConcepts.push({ term, definition: def });
                        }
                    }
                }
            });
        }
    }

    // Yeterli kavram bulunamazsa kaliteli yedekler
    const fallbackConcepts: InstagramConcept[] = [
        { term: 'Kilit Kavram 1', definition: `${title} konusunun MEB müfredatında en çok vurgulanan temel kavramıdır.` },
        { term: 'Kilit Kavram 2', definition: 'Sorularda seçenekler arasında sıkça yer alan ve ayırt edici olan önemli ilkedir.' },
        { term: 'Kilit Kavram 3', definition: 'Konunun anlaşılmasını sağlayan ve sınavda soru getiren anahtar terimdir.' }
    ];

    const concepts = rawConcepts.length >= 3 
        ? rawConcepts.slice(0, 4) 
        : [...rawConcepts, ...fallbackConcepts.slice(rawConcepts.length)];

    // 4. Önemli Konu Maddelerini Ayıkla (Konu Özeti)
    const rawKeyPoints: InstagramKeyPoint[] = [];

    if (doc) {
        doc.querySelectorAll('.list-item, .box-cyan li, .box-pink li, section li, ol li').forEach(li => {
            const full = li.textContent?.trim().replace(/^[0-9\.\-\s]+/, '') || '';
            if (full.length >= 15 && full.length <= 200) {
                const strong = li.querySelector('strong');
                let pTitle = strong?.textContent?.trim().replace(/[\:\-]$/, '') || '';
                let pText = full;
                if (pTitle && pText.startsWith(pTitle)) {
                    pText = pText.slice(pTitle.length).replace(/^[\:\-\s]+/, '').trim();
                } else if (!pTitle && full.includes(':')) {
                    const parts = full.split(':');
                    if (parts[0].length <= 25) {
                        pTitle = parts[0].trim();
                        pText = parts.slice(1).join(':').trim();
                    }
                }
                if (!pTitle) {
                    pTitle = `Önemli Madde ${rawKeyPoints.length + 1}`;
                }
                rawKeyPoints.push({ title: pTitle.slice(0, 35), text: pText.slice(0, 160) });
            }
        });
    }

    const fallbackKeyPoints: InstagramKeyPoint[] = [
        { title: 'Temel İlke', text: `${title} konusunda olayların neden-sonuç ilişkisini ve MEB kazanım hedefini iyi kavramalısın.` },
        { title: 'Soru Analizi', text: 'Paragraf sorularında metnin ana düşüncesi genellikle verilen ayet veya hadis mealiyle eşleştirilir.' },
        { title: 'Kritik Bilgi', text: 'Kavramların günlük hayattaki yansımaları ve ahlaki sonuçları yeni nesil sorularda sıkça sorulur.' }
    ];

    const keyPoints = rawKeyPoints.length >= 3 
        ? rawKeyPoints.slice(0, 3) 
        : [...rawKeyPoints, ...fallbackKeyPoints.slice(rawKeyPoints.length)];

    // 5. Püf Noktalar & Tuzaklar (Sınav İpuçları)
    const rawTips: InstagramTip[] = [];

    if (doc) {
        doc.querySelectorAll('.trap-card, .box-green p, .box-warning').forEach(el => {
            const strong = el.querySelector('strong');
            const titleText = strong?.textContent?.trim().replace(/[\:\-]$/, '') || '⚠️ Dikkat Noktası';
            let bodyText = el.textContent?.trim() || '';
            if (bodyText.startsWith(titleText)) {
                bodyText = bodyText.slice(titleText.length).replace(/^[\:\-\s]+/, '').trim();
            }
            if (bodyText.length >= 10 && bodyText.length <= 200) {
                rawTips.push({
                    title: titleText.slice(0, 35),
                    text: bodyText.slice(0, 170),
                    type: 'warning'
                });
            }
        });
    }

    const fallbackTips: InstagramTip[] = [
        {
            title: '⚠️ En Sık Yapılan Hata',
            text: 'Benzer iki kavramı birbiriyle karıştırma; soruda istenen özel terime ve soru kökündeki olumsuz ifadelere dikkat et.',
            type: 'warning'
        },
        {
            title: '🎯 Sınavda Çıkarsa Şaşırma',
            text: 'Yeni nesil sorularda kavramların tanımı doğrudan sorulmaz; verilen hikaye veya örnek olay üzerinden tespit etmen istenir.',
            type: 'tip'
        },
        {
            title: '💡 Altın Taktik',
            text: 'Öncüllü sorularda şıklardan eleme yaparak ilerle; ayet meallerindeki kilit anahtar kelimelerin altını çiz.',
            type: 'note'
        }
    ];

    const criticalTips = rawTips.length >= 2 
        ? rawTips.slice(0, 3) 
        : [...rawTips, ...fallbackTips.slice(rawTips.length)];

    return {
        gradeBadge,
        unitName: cleanUnit,
        title,
        hook: 'Sınavlarda en çok çıkan kilit kavramlar, önemli konu notları ve kritik püf noktaları tek seride topladık!',
        featurePills: ['📌 Kilit Kavramlar', '⚡ Konunun Özü', '💡 Sınav İpuçları'],
        concepts,
        keyPoints,
        criticalTips
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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentTheme, setCurrentTheme] = useState<InstagramTheme>('sunset');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [isEditingData, setIsEditingData] = useState(false);
    const slideCaptureRef = useRef<HTMLDivElement>(null);

    // Başlangıç verisini ayıkla
    const initialData = useMemo(() => {
        return extractStructuredInstagramData(
            htmlContent, 
            title, 
            grade, 
            courseName, 
            unitName, 
            sourceText
        );
    }, [htmlContent, title, grade, courseName, unitName, sourceText]);

    // Düzenlenebilir canlı durum
    const [data, setData] = useState<InstagramData>(initialData);

    // Props değişirse veriyi güncelle
    useEffect(() => {
        setData(initialData);
        setCurrentIndex(0);
    }, [initialData]);

    const theme = THEMES[currentTheme];

    // Hazır Instagram Açıklama Metni (Caption)
    const captionText = useMemo(() => {
        const conceptList = data.concepts.map(c => `🔹 ${c.term}: ${c.definition}`).join('\n');
        return `📌 ${data.title} | Renkli Ders Notu & Kilit Kavramlar 📖✨\n\n` +
            `MEB müfredatına tam uyumlu bu seride konunun tüm kilit noktalarını ve karıştırılan yerlerini senin için derledik! 💡\n\n` +
            `🔑 Önemli Kavramlar:\n${conceptList}\n\n` +
            `👉 Sola kaydırarak tüm sayfaları tek tek inceleyebilirsiniz.\n` +
            `💾 Sınav öncesi hızlıca tekrar etmek için bu gönderiyi KAYDET'e basmayı unutma!\n` +
            `👥 Sınıf arkadaşlarınla paylaşarak onların da öğrenmesine vesile olabilirsin. 🚀\n\n` +
            `📲 Bu ünitenin interaktif eğitici oyunlarını ücretsiz oynamak için profilimizdeki linke tıkla!\n\n` +
            `#dinkültürü #${data.title.replace(/\s+/g, '').toLowerCase()} #dersnotu #özet #lgs #ortaokul #dindersiatolyesi #dinbilgisi #meb #öğretmen #öğrenci`;
    }, [data]);

    const handleCopyCaption = useCallback(() => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(captionText);
            setIsCopied(true);
            toast({
                title: 'Metin Kopyalandı! 📋',
                description: 'Instagram açıklama metni ve etiketler panoya kopyalandı.',
            });
            setTimeout(() => setIsCopied(false), 2500);
        }
    }, [captionText, toast]);

    // Tekli Slayt İndir (PNG - 1080x1350 px)
    const handleDownloadCurrentSlide = async () => {
        if (!slideCaptureRef.current) return;
        setIsExporting(true);

        // html2canvas FontMetrics baseline bug fix
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
            const canvas = await html2canvas(slideCaptureRef.current, {
                scale: 2.5, // 432px * 2.5 = 1080px, 540px * 2.5 = 1350px (Instagram 4:5 Tam Standardı)
                useCORS: true,
                backgroundColor: null,
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
            link.download = `${data.title.replace(/\s+/g, '_')}_Instagram_Slayt_${currentIndex + 1}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast({
                title: 'Slayt İndirildi! 🎉',
                description: `${currentIndex + 1}. slayt ultra net 1080x1350 Instagram formatında kaydedildi.`,
            });
        } catch (error) {
            console.error('Slayt dışa aktarma hatası:', error);
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

    // Tüm 5 Slaytı Sırayla İndir
    const handleDownloadAllSlides = async () => {
        setIsExporting(true);

        let tempStyle: HTMLStyleElement | null = null;
        if (typeof document !== 'undefined') {
            tempStyle = document.createElement('style');
            tempStyle.id = 'html2canvas-font-metrics-fix';
            tempStyle.innerHTML = 'img { display: inline-block !important; }';
            document.head.appendChild(tempStyle);
        }

        try {
            const html2canvas = (await import('html2canvas')).default;
            const total = 5;

            for (let i = 0; i < total; i++) {
                setExportProgress(`Slayt ${i + 1} / ${total} hazırlanıyor...`);
                setCurrentIndex(i);
                
                // DOM ve stillerin oturması için bekleme
                await new Promise(r => setTimeout(r, 450));

                if (slideCaptureRef.current) {
                    if (typeof document !== 'undefined' && document.fonts) {
                        await document.fonts.ready;
                    }
                    const canvas = await html2canvas(slideCaptureRef.current, {
                        scale: 2.5,
                        useCORS: true,
                        backgroundColor: null,
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
                    link.download = `${data.title.replace(/\s+/g, '_')}_Instagram_Slayt_${i + 1}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    await new Promise(r => setTimeout(r, 300));
                }
            }

            toast({
                title: 'Tüm Slaytlar İndirildi! 🚀',
                description: `Toplam 5 adet yüksek çözünürlüklü Instagram görseli sırayla indirildi.`,
            });
        } catch (error) {
            console.error('Toplu indirme hatası:', error);
            toast({
                title: 'Hata',
                description: 'Toplu indirme sırasında bir sorun oluştu.',
                variant: 'destructive',
            });
        } finally {
            if (tempStyle && tempStyle.parentNode) {
                tempStyle.remove();
            }
            setIsExporting(false);
            setExportProgress(null);
        }
    };

    if (!isOpen) return null;

    // ══════════════════════════════════════════════════════════════════
    // HER BİR SLAYTIN ÖZEL VE ÇOK ŞIK ŞABLONU (432px x 540px - 4:5 Oran)
    // ══════════════════════════════════════════════════════════════════

    const renderSlideContent = () => {
        switch (currentIndex) {
            // ── SLAYT 1: KAPAK (THE HOOK) ──
            case 0:
                return (
                    <div className="flex-1 flex flex-col justify-between p-6 text-center select-text">
                        {/* Kategori Rozeti */}
                        <div className="flex justify-center pt-2">
                            <span 
                                style={{
                                    background: theme.pillBg,
                                    color: theme.pillText,
                                    border: `1.5px solid ${theme.pillBorder}`
                                }}
                                className="px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase shadow-xs flex items-center gap-1.5"
                            >
                                <span>⚡</span>
                                <span>HIZLI DERS NOTU & KAVRAMLAR</span>
                            </span>
                        </div>

                        {/* Ana Başlık ve Dekorasyon */}
                        <div className="my-auto py-2 flex flex-col items-center">
                            <h1 
                                style={{ color: theme.textPrimary }}
                                className="text-[26px] font-black tracking-tight leading-[1.2] max-w-[370px] drop-shadow-xs"
                            >
                                {data.title}
                            </h1>
                            
                            {/* Şık Vurgu Çizgisi */}
                            <div className="flex items-center gap-2 my-3 w-40 justify-center">
                                <div className="h-0.5 flex-1 rounded-full" style={{ background: theme.accentGradient }} />
                                <span className="text-xs" style={{ color: theme.accentSolid }}>✦</span>
                                <div className="h-0.5 flex-1 rounded-full" style={{ background: theme.accentGradient }} />
                            </div>

                            {/* Çarpıcı Kanca Açıklaması */}
                            <p 
                                style={{ color: theme.textSecondary }}
                                className="text-[13px] font-semibold leading-relaxed max-w-[340px]"
                            >
                                {data.hook}
                            </p>
                        </div>

                        {/* Alt Öne Çıkanlar (3 Rozet) */}
                        <div className="flex items-center justify-center gap-2 pt-1 pb-1">
                            {data.featurePills.map((pill, idx) => (
                                <span
                                    key={idx}
                                    style={{
                                        background: theme.cardBg,
                                        border: `1px solid ${theme.cardBorder}`,
                                        color: theme.textSecondary,
                                        boxShadow: theme.cardShadow
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
                                >
                                    {pill}
                                </span>
                            ))}
                        </div>
                    </div>
                );

            // ── SLAYT 2: TEMEL KAVRAMLAR (VOCABULARY) ──
            case 1:
                return (
                    <div className="flex-1 flex flex-col justify-between p-5 select-text">
                        {/* Başlık Alanı */}
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.cardBorder }}>
                            <div>
                                <h2 className="text-[17px] font-black tracking-tight flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                                    <span>📖</span>
                                    <span>Kilit Kavramlar</span>
                                </h2>
                                <p className="text-[11px] font-medium" style={{ color: theme.textMuted }}>
                                    Sorularda en çok karşına çıkacak tanımlar:
                                </p>
                            </div>
                            <span 
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                                style={{ background: theme.pillBg, color: theme.pillText }}
                            >
                                {data.concepts.length} Kavram
                            </span>
                        </div>

                        {/* Kavram Kartları */}
                        <div className="flex-1 flex flex-col justify-center gap-2.5 my-auto py-2">
                            {data.concepts.slice(0, 4).map((c, idx) => (
                                <div 
                                    key={idx}
                                    style={{
                                        background: theme.cardBg,
                                        border: `1.5px solid ${theme.cardBorder}`,
                                        boxShadow: theme.cardShadow
                                    }}
                                    className="rounded-2xl p-3 flex flex-col gap-1 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <span 
                                            style={{
                                                background: theme.badgeBg,
                                                color: theme.badgeText
                                            }}
                                            className="px-2.5 py-0.5 rounded-lg text-[11.5px] font-black uppercase tracking-wide"
                                        >
                                            {c.term}
                                        </span>
                                        <span className="text-[11px] font-bold opacity-40" style={{ color: theme.textPrimary }}>
                                            0{idx + 1}
                                        </span>
                                    </div>
                                    <p 
                                        className="text-[12.5px] font-medium leading-[1.35] pt-0.5"
                                        style={{ color: theme.textSecondary }}
                                    >
                                        {c.definition}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            // ── SLAYT 3: KONU DETAYLARI / ÖZÜ (KEY POINTS) ──
            case 2:
                return (
                    <div className="flex-1 flex flex-col justify-between p-5 select-text">
                        {/* Başlık Alanı */}
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.cardBorder }}>
                            <div>
                                <h2 className="text-[17px] font-black tracking-tight flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                                    <span>⚡</span>
                                    <span>Konunun Özü & Maddeler</span>
                                </h2>
                                <p className="text-[11px] font-medium" style={{ color: theme.textMuted }}>
                                    Soru kaçırmamak için bilmen gerekenler:
                                </p>
                            </div>
                            <span 
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                                style={{ background: theme.pillBg, color: theme.pillText }}
                            >
                                3 Önemli İlke
                            </span>
                        </div>

                        {/* Numaralandırılmış Kartlar */}
                        <div className="flex-1 flex flex-col justify-center gap-3 my-auto py-2">
                            {data.keyPoints.slice(0, 3).map((kp, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        background: theme.cardBg,
                                        border: `1.5px solid ${theme.cardBorder}`,
                                        boxShadow: theme.cardShadow
                                    }}
                                    className="rounded-2xl p-3.5 flex items-start gap-3"
                                >
                                    <div 
                                        style={{
                                            background: theme.badgeBg,
                                            color: theme.badgeText
                                        }}
                                        className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 shadow-xs mt-0.5"
                                    >
                                        0{idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 
                                            className="text-[13.5px] font-extrabold tracking-tight mb-0.5"
                                            style={{ color: theme.textPrimary }}
                                        >
                                            {kp.title}
                                        </h3>
                                        <p 
                                            className="text-[12.5px] font-medium leading-[1.35]"
                                            style={{ color: theme.textSecondary }}
                                        >
                                            {kp.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            // ── SLAYT 4: PÜF NOKTALAR & TUZAKLAR (EXAM TIPS) ──
            case 3:
                return (
                    <div className="flex-1 flex flex-col justify-between p-5 select-text">
                        {/* Başlık Alanı */}
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.cardBorder }}>
                            <div>
                                <h2 className="text-[17px] font-black tracking-tight flex items-center gap-1.5" style={{ color: theme.textPrimary }}>
                                    <span>💡</span>
                                    <span>Bunu Sakın Karıştırma!</span>
                                </h2>
                                <p className="text-[11px] font-medium" style={{ color: theme.textMuted }}>
                                    Sınavda en çok yanılgıya düşülen kritik noktalar:
                                </p>
                            </div>
                            <span 
                                className="text-[10px] font-extrabold px-2 py-0.5 rounded-md"
                                style={{ background: theme.pillBg, color: theme.pillText }}
                            >
                                Sınav İpuçları
                            </span>
                        </div>

                        {/* Kritik İpuçları Kartları */}
                        <div className="flex-1 flex flex-col justify-center gap-3 my-auto py-2">
                            {data.criticalTips.slice(0, 3).map((tip, idx) => {
                                const isWarning = tip.type === 'warning' || idx === 0;
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            background: theme.cardBg,
                                            border: `1.5px solid ${isWarning ? (currentTheme === 'dark' ? 'rgba(239, 68, 68, 0.4)' : '#fecdd3') : theme.cardBorder}`,
                                            boxShadow: theme.cardShadow
                                        }}
                                        className="rounded-2xl p-3.5 flex flex-col gap-1 relative overflow-hidden"
                                    >
                                        <div 
                                            className="absolute top-0 left-0 w-1.5 h-full"
                                            style={{
                                                background: isWarning ? '#ef4444' : theme.accentSolid
                                            }}
                                        />
                                        <div className="flex items-center gap-2 pl-1">
                                            <span className="text-sm">
                                                {isWarning ? '⚠️' : '🎯'}
                                            </span>
                                            <h3 
                                                className="text-[13px] font-extrabold tracking-tight"
                                                style={{ color: isWarning ? '#dc2626' : theme.textPrimary }}
                                            >
                                                {tip.title}
                                            </h3>
                                        </div>
                                        <p 
                                            className="text-[12.5px] font-medium leading-[1.35] pl-1"
                                            style={{ color: theme.textSecondary }}
                                        >
                                            {tip.text}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            // ── SLAYT 5: KAPANIŞ & ETKİLEŞİM (CALL TO ACTION) ──
            case 4:
            default:
                return (
                    <div className="flex-1 flex flex-col justify-between p-6 text-center select-text">
                        {/* Üst İkon & Başlık */}
                        <div className="flex flex-col items-center pt-1">
                            <div 
                                style={{
                                    background: theme.pillBg,
                                    border: `1.5px solid ${theme.pillBorder}`
                                }}
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xs mb-3"
                            >
                                🕌
                            </div>
                            <h2 
                                style={{ color: theme.textPrimary }}
                                className="text-[22px] font-black tracking-tight leading-tight"
                            >
                                Faydalı Buldun mu? ✨
                            </h2>
                            <p 
                                style={{ color: theme.textMuted }}
                                className="text-[12px] font-semibold mt-1 max-w-[320px]"
                            >
                                Bu ders notlarını sınavdan önce tekrar etmek için hemen kaydet!
                            </p>
                        </div>

                        {/* Etkileşim Adımları Kutusu */}
                        <div 
                            style={{
                                background: theme.cardBg,
                                border: `1.5px solid ${theme.cardBorder}`,
                                boxShadow: theme.cardShadow
                            }}
                            className="rounded-2xl p-3.5 flex flex-col gap-2.5 text-left my-auto"
                        >
                            <div className="flex items-center gap-3">
                                <div 
                                    style={{ background: theme.badgeBg, color: theme.badgeText }}
                                    className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                                >
                                    1
                                </div>
                                <div className="text-[12.5px]">
                                    <strong style={{ color: theme.textPrimary }}>Gönderiyi Kaydet 💾:</strong>{' '}
                                    <span style={{ color: theme.textSecondary }}>Sınav haftasında tek tıkla tekrar et.</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div 
                                    style={{ background: theme.badgeBg, color: theme.badgeText }}
                                    className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                                >
                                    2
                                </div>
                                <div className="text-[12.5px]">
                                    <strong style={{ color: theme.textPrimary }}>Arkadaşınla Paylaş 🚀:</strong>{' '}
                                    <span style={{ color: theme.textSecondary }}>Sınıf arkadaşlarına gönder, birlikte öğrenin.</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div 
                                    style={{ background: theme.badgeBg, color: theme.badgeText }}
                                    className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                                >
                                    3
                                </div>
                                <div className="text-[12.5px]">
                                    <strong style={{ color: theme.textPrimary }}>Oyunları Oyna 🎮:</strong>{' '}
                                    <span style={{ color: theme.textSecondary }}>Bu ünitenin oyunları için profildeki linke tıkla!</span>
                                </div>
                            </div>
                        </div>

                        {/* Marka İmzası */}
                        <div className="flex flex-col items-center gap-0.5 pb-1">
                            <span className="text-[13px] font-black" style={{ color: theme.accentSolid }}>
                                @dindersiatolyesi
                            </span>
                            <span className="text-[11px] font-semibold" style={{ color: theme.textMuted }}>
                                dindersiatolyesi.com • Eğlenerek Öğren
                            </span>
                        </div>
                    </div>
                );
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl w-[96vw] bg-slate-950 border border-slate-800 text-white rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[96vh] overflow-hidden">
                {/* Modern Fontlar */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet" />

                {/* MODAL ÜST BARI */}
                <DialogHeader className="pb-3 border-b border-slate-800 flex-shrink-0 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-pink-900/40 flex-shrink-0">
                            <Instagram className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                                <span>Instagram Carousel Stüdyosu (4:5)</span>
                                <Badge className="bg-pink-500/20 text-pink-300 border-pink-400/30 text-[10px] hidden sm:inline-flex">
                                    Özel Şablon • 1080x1350
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 truncate">
                                {data.title} • Ham HTML yerine özel Instagram tasarım şablonuyla üretilir
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Tema Seçici */}
                        <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                            {(Object.keys(THEMES) as InstagramTheme[]).map(tKey => (
                                <button
                                    key={tKey}
                                    type="button"
                                    onClick={() => setCurrentTheme(tKey)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                        currentTheme === tKey 
                                            ? 'bg-slate-800 text-white shadow-xs' 
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                    title={`${THEMES[tKey].name} Teması`}
                                >
                                    <span>{THEMES[tKey].icon}</span>
                                    <span className="hidden md:inline">{THEMES[tKey].name.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>

                        {/* Metin Düzenleme Paneli Aç/Kapat */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditingData(prev => !prev)}
                            className={`border rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 cursor-pointer ${
                                isEditingData 
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                            }`}
                            title="Slayt metinlerini özelleştir"
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

                        {/* Tekli Slayt İndir */}
                        <Button
                            size="sm"
                            onClick={handleDownloadCurrentSlide}
                            disabled={isExporting}
                            className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 shadow-md cursor-pointer"
                            title="Şu anki slaytı PNG (1080x1350) olarak kaydet"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Bu Slaytı İndir</span>
                        </Button>

                        {/* Tüm 5 Slaytı İndir */}
                        <Button
                            size="sm"
                            onClick={handleDownloadAllSlides}
                            disabled={isExporting}
                            className="bg-gradient-to-r from-pink-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-extrabold rounded-xl text-xs h-9 px-3.5 shadow-lg shadow-pink-900/30 flex items-center gap-1.5 cursor-pointer"
                            title="Tüm 5 slaytı sırayla bilgisayara indir"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>{exportProgress || 'İndiriliyor...'}</span>
                                </>
                            ) : (
                                <>
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>Tümünü İndir (5)</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                {/* ANA ÇALIŞMA ALANI */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center gap-4 py-3 overflow-hidden">
                    
                    {/* SOL: 4:5 Dikey Instagram Önizleme Kartı */}
                    <div className="flex flex-col items-center justify-center h-full max-h-full">
                        
                        {/* 4:5 Dikey Tuval Çerçevesi */}
                        <div className="relative p-1.5 rounded-[1.75rem] bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                            
                            {/* GERÇEK EKRAN GÖRÜNTÜSÜ ALINACAK 4:5 KART (432px x 540px -> x2.5 = 1080px x 1350px) */}
                            <div
                                ref={slideCaptureRef}
                                className="w-[432px] h-[540px] rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between relative select-none"
                                style={{
                                    fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif",
                                    background: theme.bgStyle,
                                    boxSizing: 'border-box'
                                }}
                            >
                                {/* ÜST BİLGİ BARI */}
                                <div 
                                    style={{
                                        background: theme.barBg,
                                        borderColor: theme.barBorder,
                                        color: theme.barText
                                    }}
                                    className="flex items-center justify-between px-4 py-2.5 border-b text-xs font-bold flex-shrink-0 z-10"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">🕌</span>
                                        <span className="font-extrabold tracking-tight">DinDersi Atölyesi</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span 
                                            style={{
                                                background: theme.pillBg,
                                                color: theme.pillText,
                                                border: `1px solid ${theme.pillBorder}`
                                            }}
                                            className="px-2 py-0.5 rounded-full text-[10.5px] font-black"
                                        >
                                            {data.gradeBadge}
                                        </span>
                                        <span className="text-[11px] font-black opacity-60">
                                            0{currentIndex + 1} / 05
                                        </span>
                                    </div>
                                </div>

                                {/* SLAYT İÇERİK ALANI */}
                                {renderSlideContent()}

                                {/* ALT BİLGİ BARI */}
                                <div 
                                    style={{
                                        background: theme.barBg,
                                        borderColor: theme.barBorder,
                                        color: theme.barText
                                    }}
                                    className="flex items-center justify-between px-4 py-2 border-t text-xs font-bold flex-shrink-0 z-10"
                                >
                                    <span className="text-[11px] font-extrabold opacity-70">
                                        📲 @dindersiatolyesi
                                    </span>
                                    {currentIndex < 4 ? (
                                        <span 
                                            style={{ color: theme.accentSolid }}
                                            className="text-[11px] font-black flex items-center gap-1"
                                        >
                                            Sola Kaydır 👉
                                        </span>
                                    ) : (
                                        <span 
                                            style={{
                                                background: theme.pillBg,
                                                color: theme.pillText,
                                                border: `1px solid ${theme.pillBorder}`
                                            }}
                                            className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-black"
                                        >
                                            Kaydetmeyi Unutma 💾
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Slayt Geçiş Butonları & Noktalar */}
                        <div className="flex items-center gap-3 mt-3">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                className="h-8 px-3 rounded-xl border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                            </Button>

                            {/* Nokta Göstergeleri */}
                            <div className="flex items-center gap-1.5 px-2">
                                {[0, 1, 2, 3, 4].map((idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`h-2.5 rounded-full transition-all cursor-pointer ${
                                            idx === currentIndex
                                                ? 'w-7 bg-pink-500 shadow-md shadow-pink-500/50'
                                                : 'w-2.5 bg-slate-700 hover:bg-slate-500'
                                        }`}
                                        title={`${idx + 1}. Slayt`}
                                    />
                                ))}
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentIndex(prev => Math.min(4, prev + 1))}
                                disabled={currentIndex === 4}
                                className="h-8 px-3 rounded-xl border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold cursor-pointer"
                            >
                                Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>

                    {/* SAĞ: Slayt Seçici veya Metin Düzenleme Paneli */}
                    <div className="flex-1 min-w-0 h-full flex flex-col gap-3 justify-between">
                        
                        {isEditingData ? (
                            /* ── METİN DÜZENLEME PANELİ (ÖZEL FORM) ── */
                            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto max-h-[540px] text-xs">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="font-extrabold text-amber-300 flex items-center gap-1.5 text-sm">
                                        <Edit3 className="w-4 h-4" />
                                        <span>Slayt Metinlerini Düzenle</span>
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setData(initialData)}
                                        className="h-7 text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                        title="Varsayılan metinlere geri dön"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Sıfırla
                                    </Button>
                                </div>

                                {/* Başlık & Kanca */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Ana Konu Başlığı:</label>
                                    <input 
                                        type="text"
                                        value={data.title}
                                        onChange={e => setData(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-300">Kapak Kanca Cümlesi:</label>
                                    <textarea 
                                        value={data.hook}
                                        rows={2}
                                        onChange={e => setData(prev => ({ ...prev, hook: e.target.value }))}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                                    />
                                </div>

                                {/* Kavramlar */}
                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-amber-300 block">Kilit Kavramlar (Slayt 2):</label>
                                    {data.concepts.map((c, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input 
                                                type="text"
                                                value={c.term}
                                                placeholder="Kavram"
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setData(prev => {
                                                        const next = [...prev.concepts];
                                                        next[i] = { ...next[i], term: val };
                                                        return { ...prev, concepts: next };
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
                                                    setData(prev => {
                                                        const next = [...prev.concepts];
                                                        next[i] = { ...next[i], definition: val };
                                                        return { ...prev, concepts: next };
                                                    });
                                                }}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Konu Maddeleri */}
                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                    <label className="font-bold text-amber-300 block">Önemli Maddeler (Slayt 3):</label>
                                    {data.keyPoints.map((kp, i) => (
                                        <div key={i} className="flex flex-col gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                                            <input 
                                                type="text"
                                                value={kp.title}
                                                placeholder="Madde Başlığı"
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setData(prev => {
                                                        const next = [...prev.keyPoints];
                                                        next[i] = { ...next[i], title: val };
                                                        return { ...prev, keyPoints: next };
                                                    });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold text-xs"
                                            />
                                            <textarea 
                                                value={kp.text}
                                                rows={2}
                                                placeholder="Madde Açıklaması"
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setData(prev => {
                                                        const next = [...prev.keyPoints];
                                                        next[i] = { ...next[i], text: val };
                                                        return { ...prev, keyPoints: next };
                                                    });
                                                }}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
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
                                        Değişiklikleri Görsele Uygula ✨
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            /* ── NORMAL ÖNİZLEME & PAYLAŞIM ALANI ── */
                            <>
                                {/* Slayt Mini Kartları */}
                                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                                    <span className="text-xs font-bold text-slate-400 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Layers className="w-3.5 h-3.5 text-pink-400" />
                                            <span>Carousel Slaytları (5 Sayfa)</span>
                                        </span>
                                        <span className="text-[11px] text-pink-400 font-bold">1080 x 1350 px</span>
                                    </span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { title: 'Kapak', icon: '⚡' },
                                            { title: 'Kavramlar', icon: '📖' },
                                            { title: 'Konu Özü', icon: '⚡' },
                                            { title: 'Tuzaklar', icon: '💡' },
                                            { title: 'Kapanış', icon: '🕌' }
                                        ].map((s, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setCurrentIndex(idx)}
                                                className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                                                    idx === currentIndex
                                                        ? 'bg-pink-600/20 border-pink-500 text-white shadow-md'
                                                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                    <span>{s.icon} Slayt 0{idx + 1}</span>
                                                    {idx === currentIndex && <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>}
                                                </div>
                                                <div className="text-xs font-black text-slate-200 truncate">
                                                    {s.title}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Hazır Açıklama Metni (Caption) Kutusu */}
                                <div className="flex-1 min-h-0 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 overflow-hidden">
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
                                            {isCopied ? 'Kopyalandı' : 'Kopyala'}
                                        </Button>
                                    </div>
                                    <div className="flex-1 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 overflow-y-auto text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-wrap select-text scrollbar-thin">
                                        {captionText}
                                    </div>
                                </div>

                                {/* Paylaşım Tavsiyesi */}
                                <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-[11.5px] text-pink-200 flex items-center gap-2">
                                    <span>💡</span>
                                    <span><strong>İpucu:</strong> "Tümünü İndir"e basıp inen 5 görseli Instagram'da sırayla seçin; açıklama metnini yapıştırıp doğrudan paylaşın!</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
