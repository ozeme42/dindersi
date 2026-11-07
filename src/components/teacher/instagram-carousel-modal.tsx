'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Download, Copy, Check, Sparkles, Loader2, Edit3, RotateCcw, ImageIcon, Palette
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. ŞABLON: 5. SINIF DOODLE ŞABLONU (4 KARTLI - ALLAH İNANCI VB.)
// ─────────────────────────────────────────────────────────────────────────────
export interface Doodle4CardData {
    topBanner: string;         // "5. Sınıf Din Kültürü - YAZILI VAKTİ"
    unitTag: string;           // "1. Ünite: Allah İnancı"
    subTitle: string;          // "1. Dönem 1. Yazılı Hazırlık Notları"

    // Kutu 1: Evrendeki Mükemmel Düzen (Mavi Kart)
    box1: {
        title: string;
        bullets: string[];
    };

    // Kutu 2: Allah'ın Varlığı ve Birliği (Sarı Kart)
    box2: {
        title: string;
        bullets: string[];
    };

    // Kutu 3: Esma-i Hüsna (Yeşil Kart)
    box3: {
        title: string;
        names: Array<{ name: string; meaning: string }>;
    };

    // Kutu 4: İhlas Suresi ve Anlamı (Şeftali / Turuncu Kart)
    box4: {
        title: string;
        bullets: string[];
    };

    // Alt Unutma Şeridi
    unutmaBullets: string[];
    handle: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ŞABLON: 6. SINIF YAZILI VAKTİ (6 KART + TABLO)
// ─────────────────────────────────────────────────────────────────────────────
export interface YaziliVaktiSheetData {
    gradeTag: string;          // "6. Sınıf Din Kültürü ve Ahlak Bilgisi"
    unitTag: string;           // "1. ÜNİTE"
    topicTitle: string;        // "Peygamber ve İlahî Kitap İnancı"
    subTitle: string;          // "1. Dönem 1. Yazılıya Hazırlık Notları"

    // Satır 1
    card1: {
        title: string;
        bullets: string[];
    };
    card2: {
        title: string;
        items: Array<{ term: string; desc: string; color: string }>;
    };

    // Satır 2
    card3: {
        title: string;
        items: Array<{ num: number; term: string; desc: string }>;
    };
    card4: {
        title: string;
        sub1Title: string;
        sub1Text: string;
        sub2Title: string;
        sub2Bullets: string[];
    };

    // Satır 3
    card5: {
        title: string;
        bullets: string[];
    };
    card6: {
        title: string;
        col1Header: string;
        col2Header: string;
        rows: Array<{ col1: string; col2: string; bg: string }>;
    };

    // Satır 4 (Unutma! Şeridi)
    unutmaBullets: string[];
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
 * 5. Sınıf Doodle Verisini ayıklar / oluşturur
 */
function extractDoodle4Data(
    htmlContent: string,
    rawTitle: string,
    grade?: string,
    unitName?: string
): Doodle4CardData {
    let detectedGrade = grade || '';
    if (!detectedGrade) {
        const m = (htmlContent + ' ' + rawTitle).match(/(\d+)\.\s*Sınıf/i);
        if (m) detectedGrade = m[1];
    }
    const gradeNumber = detectedGrade || '5';
    const topBanner = `${gradeNumber}. Sınıf Din Kültürü - YAZILI VAKTİ`;
    const cleanUnit = cleanText(unitName || '').replace(/^\d+[\.\-\s]+/, '').trim();
    const unitTag = cleanUnit ? `1. Ünite: ${cleanUnit}` : '1. Ünite: Allah İnancı';
    const subTitle = `${gradeNumber}. Sınıf 1. Dönem 1. Yazılı Hazırlık Notları`;

    let doc: Document | null = null;
    if (typeof window !== 'undefined' && htmlContent) {
        try {
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlContent, 'text/html');
        } catch {
            doc = null;
        }
    }

    const extractedBullets: string[] = [];
    if (doc) {
        doc.querySelectorAll('.list-item, li, p').forEach(el => {
            const txt = cleanText(el.textContent || '').replace(/^[0-9\.\-\s]+/, '');
            if (txt.length >= 15 && txt.length <= 160 && !extractedBullets.includes(txt)) {
                extractedBullets.push(truncateWord(txt, 110));
            }
        });
    }

    // Kutu 1: Evrendeki Mükemmel Düzen
    const box1Bullets = extractedBullets.length >= 4 
        ? extractedBullets.slice(0, 4)
        : [
            'Evrendeki her varlık kusursuz bir ölçü ve ahenk içinde yaratılmıştır.',
            'Güneşin doğuşu, mevsimler, gece-gündüz düzenli bir kanuna bağlıdır.',
            'Canlıların soluduğu oksijen ve su döngüsü mükemmel bir intizamdır.',
            'Ayet: "Biz her şeyi bir ölçüye göre yarattık." (Kamer Suresi, 49)'
        ];

    // Kutu 2: Allah'ın Varlığı ve Birliği (Tevhid)
    const box2Bullets = extractedBullets.length >= 8 
        ? extractedBullets.slice(4, 8)
        : [
            'Tevhid: Allah\'ın bir ve tek olduğuna, eşi ve benzeri olmadığına inanmaktır.',
            'Sanatlı bir resim ressamı, düzenli bir bina ustasını gösterir.',
            'Evrendeki intizam, her şeyi yaratan tek bir Kudret olduğunu kanıtlar.',
            'Ayet: "Yerde ve gökte başka ilahlar olsaydı düzen bozulurdu." (Enbiyâ, 22)'
        ];

    // Kutu 3: Esma-i Hüsna
    const defaultNames = [
        { name: 'Rahmân', meaning: 'Dünyada tüm canlılara merhamet eden' },
        { name: 'Rahîm', meaning: 'Ahirette inananları ödüllendiren' },
        { name: 'Âlim', meaning: 'Her şeyi, gizliyi ve açığı en iyi bilen' },
        { name: 'Basîr', meaning: 'Her şeyi en ince ayrıntısıyla gören' },
        { name: 'Semî', meaning: 'Tüm fısıltıları, sesleri ve duaları işiten' },
        { name: 'Kadîr', meaning: 'Her şeye gücü yeten, sonsuz kudret sahibi' }
    ];

    // Kutu 4: İhlas Suresi ve Anlamı
    const box4Bullets = [
        'Tevhid inancını en öz ve en açık biçimde açıklayan suredir.',
        '1. De ki: O Allah birdir, tektir.',
        '2. Allah Samed\'dir (Her şey O\'na muhtaç, O hiçbir şeye muhtaç değildir).',
        '3. O, doğurmamış ve doğmamıştır.',
        '4. O\'nun hiçbir dengi ve benzeri yoktur.'
    ];

    // Unutma Şeridi
    const unutmaBullets = [
        'Evrendeki düzen tesadüf eseri olamaz; her eserin mutlaka bir ustası vardır.',
        'İhlas Suresi tevhid inancını özetlediği için Kur\'an-ın üçte birine denk kabul edilmiştir.'
    ];

    return {
        topBanner,
        unitTag,
        subTitle,
        box1: {
            title: 'Evrendeki Mükemmel Düzen',
            bullets: box1Bullets
        },
        box2: {
            title: 'Allah’ın Varlığı ve Birliği',
            bullets: box2Bullets
        },
        box3: {
            title: 'Esma-i Hüsna',
            names: defaultNames
        },
        box4: {
            title: 'İhlas Suresi ve Anlamı',
            bullets: box4Bullets
        },
        unutmaBullets,
        handle: '@yazilivakti'
    };
}

/**
 * 6. Sınıf Yazılı Vakti Verisini ayıklar / oluşturur
 */
function extractYaziliVaktiData(
    htmlContent: string,
    rawTitle: string,
    grade?: string,
    unitName?: string
): YaziliVaktiSheetData {
    let cleanTitle = cleanText(rawTitle || 'Peygamber ve İlahî Kitap İnancı')
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
    const cleanUnit = cleanText(unitName || '').replace(/^\d+[\.\-\s]+/, '').trim();
    const unitTag = cleanUnit ? (cleanUnit.length > 15 ? cleanUnit.slice(0, 15) : cleanUnit) : '1. ÜNİTE';
    const subTitle = `${gradeNumber}. Sınıf 1. Dönem 1. Yazılıya Hazırlık Notları`;

    let doc: Document | null = null;
    if (typeof window !== 'undefined' && htmlContent) {
        try {
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlContent, 'text/html');
        } catch {
            doc = null;
        }
    }

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
                    extractedConcepts.push({ term, desc: truncateWord(def, 65) });
                }
            }
        });
    }

    const extractedBullets: Array<{ title: string; text: string }> = [];
    if (doc) {
        doc.querySelectorAll('.list-item, li').forEach(liEl => {
            const full = cleanText(liEl.textContent || '').replace(/^[0-9\.\-\s]+/, '');
            if (full.length >= 10 && full.length <= 220) {
                const strong = liEl.querySelector('strong');
                let bTitle = cleanText(strong?.textContent || '').replace(/[\:\-]$/, '');
                let bText = full;
                if (bTitle && bText.startsWith(bTitle)) {
                    bText = bText.slice(bTitle.length).replace(/^[\:\-\s]+/, '').trim();
                }
                extractedBullets.push({
                    title: truncateWord(bTitle, 25),
                    text: truncateWord(bText, 95)
                });
            }
        });
    }

    // Kart 1
    const card1Bullets = extractedBullets.length >= 4 
        ? extractedBullets.slice(0, 4).map(b => b.title ? `${b.title}: ${b.text}` : b.text)
        : [
            'Allah\'ın (c.c.) emir, yasak ve öğütlerini insanlara bildirmekle görevli seçilmiş elçidir.',
            'İnsanları doğru yola, birliğe ve güzel ahlaka çağırır.',
            'Allah (c.c.) ile insanlar arasında vahiy köprüsü kurar.',
            'Son peygamber Hz. Muhammed\'dir (s.a.v.).'
        ];

    // Kart 2 (Sıdk, Emanet, İsmet, Tebliğ, Fetanet)
    const defaultCard2 = [
        { term: 'Sıdk', desc: 'Doğru ve dürüst olmaları.', color: '#16a34a' },
        { term: 'Emanet', desc: 'Güvenilir olmaları.', color: '#e11d48' },
        { term: 'İsmet', desc: 'Günahlardan korunmuş olmaları.', color: '#0284c7' },
        { term: 'Tebliğ', desc: 'Allah\'tan aldıkları mesajı eksiksiz bildirmeleri.', color: '#9333ea' },
        { term: 'Fetanet', desc: 'Akıllı ve zekî olmaları.', color: '#ea580c' }
    ];

    // Kart 3 (Peygamberlerin Görevleri)
    const defaultCard3 = [
        { num: 1, term: 'Tebliğ', desc: 'Allah\'ın (c.c.) mesajlarını insanlara bildirmek.' },
        { num: 2, term: 'İnzar', desc: 'İnsanları kötülüklerden sakındırmak.' },
        { num: 3, term: 'Tebşir', desc: 'İyi davranışları müjdelemek.' },
        { num: 4, term: 'Tezkiye', desc: 'İnsanları iyiliğe ve ahlaklı olmaya yönlendirmek.' },
        { num: 5, term: 'Temsil', desc: 'Güzel davranışlarıyla insanlara örnek olmak.' },
        { num: 6, term: 'Hidayet', desc: 'İnsanları doğru yola çağırmak.' }
    ];

    return {
        gradeTag,
        unitTag,
        topicTitle: cleanTitle,
        subTitle,
        card1: {
            title: 'Peygamber Kimdir?',
            bullets: card1Bullets
        },
        card2: {
            title: 'Peygamberlerin Özellikleri',
            items: defaultCard2
        },
        card3: {
            title: 'Peygamberlerin Görevleri',
            items: defaultCard3
        },
        card4: {
            title: 'Vahiy ve Vahyin Özellikleri',
            sub1Title: 'Vahiy Nedir?',
            sub1Text: 'Allah\'ın (c.c.) seçtiği peygamberlere bildirdiği ilahî mesajdır.',
            sub2Title: 'Vahyin Özellikleri',
            sub2Bullets: [
                'Allah (c.c.) tarafından gönderilir.',
                'Doğru ve güvenilirdir.',
                'İnsanlara yol gösterir.',
                'Dünya ve ahiret mutluluğunu amaçlar.'
            ]
        },
        card5: {
            title: 'İlahî Kitaplar',
            bullets: [
                'Allah\'ın (c.c.) peygamberlerine gönderdiği kutsal kitaplara ilahî kitap denir.',
                'İnsanlara doğru yolu, inanç, ibadet ve ahlak esaslarını öğretir.'
            ]
        },
        card6: {
            title: 'Dört Büyük İlahî Kitap',
            col1Header: 'İlahî Kitap',
            col2Header: 'Gönderildiği Peygamber',
            rows: [
                { col1: 'Tevrat', col2: 'Hz. Musa (a.s.)', bg: '#e0f2fe' },
                { col1: 'Zebur', col2: 'Hz. Davud (a.s.)', bg: '#dcfce7' },
                { col1: 'İncil', col2: 'Hz. İsa (a.s.)', bg: '#fce7f3' },
                { col1: 'Kur\'an-ı Kerim', col2: 'Hz. Muhammed (s.a.v.)', bg: '#f3e8ff' }
            ]
        },
        unutmaBullets: [
            'Allah (c.c.) insanlara rehberlik etmek için peygamberler göndermiş ve ilahî kitaplar indirmiştir.',
            'Kur\'an-ı Kerim, gönderilen son ilahî kitaptır ve kıyamete kadar korunacaktır.'
        ]
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
    
    // Şablon Seçimi: 'doodle4' (5. Sınıf Doodle) veya 'yazilivakti6' (6. Sınıf İnfografik)
    const initialTemplate = useMemo(() => {
        const text = (title + ' ' + (unitName || '') + ' ' + (grade || '')).toLowerCase();
        if (text.includes('5') || text.includes('allah') || text.includes('esma') || text.includes('ihlas')) {
            return 'doodle4';
        }
        return 'yazilivakti6';
    }, [title, unitName, grade]);

    const [activeTemplate, setActiveTemplate] = useState<'doodle4' | 'yazilivakti6'>(initialTemplate);
    const captureRef = useRef<HTMLDivElement>(null);

    // 5. Sınıf Doodle Verisi
    const initialDoodleData = useMemo(() => {
        return extractDoodle4Data(htmlContent, title, grade, unitName);
    }, [htmlContent, title, grade, unitName]);
    const [doodleData, setDoodleData] = useState<Doodle4CardData>(initialDoodleData);

    // 6. Sınıf Klasik Veri
    const initialSheetData = useMemo(() => {
        return extractYaziliVaktiData(htmlContent, title, grade, unitName);
    }, [htmlContent, title, grade, unitName]);
    const [sheetData, setSheetData] = useState<YaziliVaktiSheetData>(initialSheetData);

    useEffect(() => {
        setDoodleData(initialDoodleData);
        setSheetData(initialSheetData);
        setActiveTemplate(initialTemplate);
    }, [initialDoodleData, initialSheetData, initialTemplate]);

    // Hazır Instagram Açıklama Metni (Caption)
    const captionText = useMemo(() => {
        const topic = activeTemplate === 'doodle4' ? doodleData.unitTag : sheetData.topicTitle;
        return `📌 ${topic} | Yazılıya Hazırlık Çalışma Notu 📖✨\n\n` +
            `Sınavlar ve yazılılar öncesi ${topic} konusunun tüm kilit noktalarını ve önemli yerlerini tek görselde topladık! 💡\n\n` +
            `💾 Sınav haftasında hızlıca tekrar etmek için bu gönderiyi KAYDET'e basmayı unutma!\n` +
            `👥 Sınıf arkadaşlarınla paylaşarak onların da faydalanmasını sağlayabilirsin. 🚀\n\n` +
            `📲 Bu ünitenin interaktif eğitici oyunlarını ücretsiz oynamak için profilimizdeki linke tıkla!\n\n` +
            `#dinkültürü #${title.replace(/\s+/g, '').toLowerCase()} #yazılıyahazırlık #çalışmanotu #lgs #ortaokul #dindersiatolyesi #yazilivakti #meb #öğretmen #öğrenci`;
    }, [activeTemplate, doodleData, sheetData, title]);

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

    // Görseli İndir (PNG - Ultra HD 1080px genişlik)
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
                scale: 2.0, // 540px * 2 = 1080px net çözünürlük
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
            const fileName = activeTemplate === 'doodle4' 
                ? `${doodleData.unitTag.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '_')}_Doodle_Post.png`
                : `${sheetData.topicTitle.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]/g, '_')}_Yazili_Vakti.png`;
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast({
                title: 'Çalışma Notu İndirildi! 🎉',
                description: 'Ultra net 1080px çözünürlükte Instagram postu başarıyla kaydedildi.',
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
                <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700;800;900&family=Nunito:wght@700;800;900&family=Comic+Neue:wght@700&display=swap" rel="stylesheet" />

                {/* MODAL ÜST BARI */}
                <DialogHeader className="pb-2.5 border-b border-slate-800 flex-shrink-0 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 flex-shrink-0 text-xl font-black">
                            🎨
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                                <span>Instagram Çalışma Notu Postu</span>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] hidden sm:inline-flex">
                                    3:4 / 4:5 Dikey Post
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 truncate">
                                Sevimli doodle illüstrasyonları, pastel kutular ve net MEB müfredatı özeti
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Şablon Seçici Haplar */}
                        <div className="hidden sm:flex bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setActiveTemplate('doodle4')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    activeTemplate === 'doodle4' 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                🎨 5. Sınıf Doodle (4 Kart)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTemplate('yazilivakti6')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    activeTemplate === 'yazilivakti6' 
                                        ? 'bg-sky-600 text-white shadow-xs' 
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                🕌 6. Sınıf Klasik (6 Kart)
                            </button>
                        </div>

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
                            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-black rounded-xl text-xs h-9 px-4 shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
                            title="Görseli ultra net 1080px çözünürlükte indir"
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
                    
                    {/* SOL: DİKEY İNSTAGRAM POST TUVALİ */}
                    <div className="flex flex-col items-center justify-center h-full max-h-full">
                        <div className="relative p-1.5 rounded-[1.5rem] bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                            
                            {/* ═══════════════════════════════════════════════════════════════════ */}
                            {/* 1. ŞABLON: 5. SINIF DOODLE POSTU (4 KUTULU PASTEL ÇALIŞMA KAĞIDI) */}
                            {/* ═══════════════════════════════════════════════════════════════════ */}
                            {activeTemplate === 'doodle4' && (
                                <div
                                    ref={captureRef}
                                    className="w-[540px] h-[720px] bg-[#ffffff] rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between relative select-none p-3 border-[3px] border-[#6ee7b7]"
                                    style={{
                                        fontFamily: "'Fredoka', 'Nunito', sans-serif",
                                        boxSizing: 'border-box',
                                        color: '#0f172a'
                                    }}
                                >
                                    {/* ══ ÜST BAŞLIK ALANI ══ */}
                                    <div className="flex flex-col items-center relative flex-shrink-0 pt-0.5">
                                        {/* Üst Ana Banner (Yeşil Arkaplan, Siyah Çerçeve, Kalem İllüstrasyonu) */}
                                        <div className="relative w-full flex items-center justify-center">
                                            <div className="bg-[#a7f3d0] border-[2.5px] border-[#0f172a] rounded-2xl py-1.5 px-6 shadow-xs w-full max-w-[430px] text-center">
                                                <h1 className="text-[20px] font-black text-[#0f172a] tracking-tight m-0">
                                                    {doodleData.topBanner}
                                                </h1>
                                            </div>

                                            {/* Sağ Üst Kalem Doodle */}
                                            <div className="absolute -top-2 right-4 w-9 h-9 select-none transform rotate-12">
                                                <svg viewBox="0 0 40 40" className="w-9 h-9" fill="none">
                                                    <polygon points="12,32 8,36 10,30" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
                                                    <polygon points="8,36 7,37 9,35" fill="#0f172a" />
                                                    <rect x="10" y="8" width="10" height="24" rx="2" transform="rotate(45 10 8)" fill="#facc15" stroke="#0f172a" strokeWidth="1.5" />
                                                    <rect x="25" y="2" width="10" height="6" rx="2" transform="rotate(45 25 2)" fill="#f472b6" stroke="#0f172a" strokeWidth="1.5" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Banner Altı Süslemeler & Alt Başlıklar */}
                                        <div className="w-full flex items-center justify-between px-2 mt-1 relative">
                                            {/* Sol: Cami Doodle */}
                                            <div className="w-12 h-10 select-none flex-shrink-0">
                                                <svg viewBox="0 0 60 50" className="w-12 h-10" fill="none">
                                                    <rect x="15" y="24" width="30" height="22" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.5" />
                                                    <path d="M20 24 A10 10 0 0 1 40 24 Z" fill="#f472b6" stroke="#0f172a" strokeWidth="1.5" />
                                                    <path d="M26 46 V34 A4 4 0 0 1 34 34 V46 Z" fill="#0284c7" stroke="#0f172a" strokeWidth="1.5" />
                                                    <rect x="8" y="12" width="5" height="34" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" />
                                                    <polygon points="10.5,5 7,12 14,12" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" />
                                                    <rect x="47" y="12" width="5" height="34" fill="#fef08a" stroke="#0f172a" strokeWidth="1.5" />
                                                    <polygon points="49.5,5 46,12 53,12" fill="#fbbf24" stroke="#0f172a" strokeWidth="1" />
                                                    <circle cx="30" cy="9" r="2" fill="#fde047" stroke="#0f172a" strokeWidth="1" />
                                                </svg>
                                            </div>

                                            {/* Orta Sol: Gülen Hilal & Yıldız Doodle */}
                                            <div className="w-8 h-8 select-none flex-shrink-0">
                                                <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
                                                    <path d="M26 8 A14 14 0 1 0 32 30 A12 12 0 1 1 26 8 Z" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
                                                    <circle cx="17" cy="20" r="1.5" fill="#0f172a" />
                                                    <path d="M15 25 Q18 28 21 25" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                                                    <polygon points="30,12 32,16 36,17 33,20 34,24 30,22 26,24 27,20 24,17 28,16" fill="#facc15" stroke="#0f172a" strokeWidth="1" />
                                                </svg>
                                            </div>

                                            {/* Orta: Ünite ve Yazılı Başlık Hapları */}
                                            <div className="flex flex-col items-center gap-1 flex-1 px-1">
                                                <div className="bg-[#e0f2fe] border-[1.5px] border-[#0284c7] text-[#0369a1] text-[11px] font-black px-4 py-0.5 rounded-full shadow-xs">
                                                    {doodleData.unitTag}
                                                </div>
                                                <div className="bg-[#fee2e2] border-[1.5px] border-[#f43f5e] text-[#be123c] text-[10px] font-black px-4 py-0.5 rounded-full">
                                                    {doodleData.subTitle}
                                                </div>
                                            </div>

                                            {/* Sağ: Açık Kitap Doodle */}
                                            <div className="w-12 h-10 select-none flex-shrink-0">
                                                <svg viewBox="0 0 60 50" className="w-12 h-10" fill="none">
                                                    <path d="M8 36 Q30 32 30 18 Q30 32 52 36 L48 12 Q30 8 30 14 Q30 8 12 12 Z" fill="#fef9c3" stroke="#0f172a" strokeWidth="1.5" />
                                                    <path d="M30 16 V34" stroke="#0f172a" strokeWidth="1.5" />
                                                    <path d="M4 38 Q30 34 30 20 Q30 34 56 38" stroke="#4ade80" strokeWidth="3" fill="none" strokeLinecap="round" />
                                                    <path d="M30 34 L28 44 L32 40 L36 44 L34 34 Z" fill="#f43f5e" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ══ 4 ADET PASTEL KART (2x2 GRID DÜZENİ) ══ */}
                                    <div className="grid grid-cols-2 gap-2.5 flex-1 my-1">
                                        
                                        {/* ── KUTU 1: EVRENDEKİ MÜKEMMEL DÜZEN (AÇIK MAVİ KART) ── */}
                                        <div className="border-[2.5px] border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2.5 flex flex-col justify-between shadow-xs">
                                            {/* Başlık */}
                                            <div className="text-center font-black text-[#0369a1] text-[12px] leading-tight mb-1 border-b border-[#bae6fd] pb-1">
                                                {doodleData.box1.title}
                                            </div>

                                            {/* Sevimli Doğa & Gezegen Doodle'ları */}
                                            <div className="flex items-center justify-around py-0.5 my-0.5 bg-white/70 rounded-xl border border-[#bae6fd]/50">
                                                {/* Dünya */}
                                                <div className="w-7 h-7">
                                                    <svg viewBox="0 0 30 30" className="w-7 h-7" fill="none">
                                                        <circle cx="15" cy="15" r="13" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                                                        <path d="M6 15 Q10 8 16 10 Q18 16 12 20 Z" fill="#4ade80" stroke="#0f172a" strokeWidth="1" />
                                                        <path d="M18 18 Q24 16 26 22 Q20 27 16 24 Z" fill="#4ade80" stroke="#0f172a" strokeWidth="1" />
                                                    </svg>
                                                </div>
                                                {/* Güneş */}
                                                <div className="w-7 h-7">
                                                    <svg viewBox="0 0 30 30" className="w-7 h-7" fill="none">
                                                        <circle cx="15" cy="8" r="8" fill="#fde047" stroke="#0f172a" strokeWidth="1.5" />
                                                        <line x1="15" y1="2" x2="15" y2="5" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                                                        <line x1="15" y1="25" x2="15" y2="28" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                                                        <line x1="2" y1="15" x2="5" y2="15" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                                                        <line x1="25" y1="15" x2="28" y2="15" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                                                        <circle cx="13" cy="14" r="1" fill="#0f172a" />
                                                        <circle cx="17" cy="14" r="1" fill="#0f172a" />
                                                        <path d="M13 17 Q15 19 17 17" stroke="#0f172a" strokeWidth="1" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                                {/* Yağmur Bulutu */}
                                                <div className="w-7 h-7">
                                                    <svg viewBox="0 0 30 30" className="w-7 h-7" fill="none">
                                                        <path d="M8 18 A5 5 0 0 1 12 11 A6 6 0 0 1 22 12 A5 5 0 0 1 24 18 Z" fill="#bae6fd" stroke="#0f172a" strokeWidth="1.5" />
                                                        <line x1="10" y1="21" x2="9" y2="25" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
                                                        <line x1="16" y1="21" x2="15" y2="25" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
                                                        <line x1="22" y1="21" x2="21" y2="25" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                                {/* Elma Ağacı */}
                                                <div className="w-7 h-7">
                                                    <svg viewBox="0 0 30 30" className="w-7 h-7" fill="none">
                                                        <rect x="13" y="18" width="4" height="10" fill="#78350f" stroke="#0f172a" strokeWidth="1.2" />
                                                        <circle cx="15" cy="12" r="9" fill="#4ade80" stroke="#0f172a" strokeWidth="1.5" />
                                                        <circle cx="12" cy="10" r="1.5" fill="#ef4444" />
                                                        <circle cx="17" cy="13" r="1.5" fill="#ef4444" />
                                                        <circle cx="14" cy="15" r="1.5" fill="#ef4444" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Maddeler */}
                                            <div className="space-y-1.5 flex-1 mt-1">
                                                {doodleData.box1.bullets.map((b, i) => (
                                                    <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1.5">
                                                        <span className="text-[#0284c7] font-black text-xs flex-shrink-0">•</span>
                                                        <span>{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ── KUTU 2: ALLAH'IN VARLIĞI VE BİRLİĞİ (SARI KART) ── */}
                                        <div className="border-[2.5px] border-[#facc15] bg-[#fefce8] rounded-2xl p-2.5 flex flex-col justify-between shadow-xs">
                                            {/* Başlık */}
                                            <div className="text-center font-black text-[#854d0e] text-[12px] leading-tight mb-1 border-b border-[#fde047] pb-1">
                                                {doodleData.box2.title}
                                            </div>

                                            {/* Büyüteç, Terazi, Kitap Doodle'ları */}
                                            <div className="flex items-center justify-around py-0.5 my-0.5 bg-white/70 rounded-xl border border-[#fde047]/60">
                                                {/* Büyüteç */}
                                                <div className="w-7 h-7">
                                                    <svg viewBox="0 0 30 30" className="w-7 h-7" fill="none">
                                                        <circle cx="12" cy="12" r="8" fill="#bae6fd" stroke="#0f172a" strokeWidth="1.5" />
                                                        <line x1="18" y1="18" x2="26" y2="26" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
                                                        <circle cx="12" cy="12" r="5" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 3" />
                                                    </svg>
                                                </div>
                                                {/* Adalet Terazisi */}
                                                <div className="w-8 h-7">
                                                    <svg viewBox="0 0 34 30" className="w-8 h-7" fill="none">
                                                        <line x1="17" y1="4" x2="17" y2="26" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                                                        <line x1="6" y1="8" x2="28" y2="8" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                                                        <line x1="6" y1="8" x2="4" y2="17" stroke="#ca8a04" strokeWidth="1" />
                                                        <line x1="6" y1="8" x2="8" y2="17" stroke="#ca8a04" strokeWidth="1" />
                                                        <path d="M2 17 Q6 21 10 17 Z" fill="#fde047" stroke="#0f172a" strokeWidth="1.2" />
                                                        <line x1="28" y1="8" x2="26" y2="17" stroke="#ca8a04" strokeWidth="1" />
                                                        <line x1="28" y1="8" x2="30" y2="17" stroke="#ca8a04" strokeWidth="1" />
                                                        <path d="M24 17 Q28 21 32 17 Z" fill="#fde047" stroke="#0f172a" strokeWidth="1.2" />
                                                        <rect x="11" y="24" width="12" height="3" rx="1" fill="#0f172a" />
                                                    </svg>
                                                </div>
                                                {/* Açık Kitap */}
                                                <div className="w-7 h-7">
                                                    <svg viewBox="0 0 30 30" className="w-7 h-7" fill="none">
                                                        <path d="M4 22 Q15 20 15 10 Q15 20 26 22 L24 6 Q15 4 15 8 Q15 4 6 6 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                                                        <line x1="15" y1="9" x2="15" y2="21" stroke="#0f172a" strokeWidth="1.5" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Maddeler */}
                                            <div className="space-y-1.5 flex-1 mt-1">
                                                {doodleData.box2.bullets.map((b, i) => (
                                                    <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1.5">
                                                        <span className="text-[#ca8a04] font-black text-xs flex-shrink-0">•</span>
                                                        <span>{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ── KUTU 3: ESMA-İ HÜSNA (YEŞİL KART) ── */}
                                        <div className="border-[2.5px] border-[#4ade80] bg-[#f0fdf4] rounded-2xl p-2.5 flex flex-col justify-between shadow-xs">
                                            {/* Başlık */}
                                            <div className="text-center font-black text-[#15803d] text-[12px] leading-tight mb-1 border-b border-[#bbf7d0] pb-1">
                                                {doodleData.box3.title}
                                            </div>

                                            {/* Kulak, Göz, Yaprak, Kuş İllüstrasyonları */}
                                            <div className="flex items-center justify-around py-0.5 my-0.5 bg-white/70 rounded-xl border border-[#bbf7d0]">
                                                {/* Kulak (Semî) */}
                                                <div className="w-6 h-6 flex items-center justify-center" title="Semî: Her sesi işiten">
                                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                                                        <path d="M8 7 A5 5 0 0 1 18 7 C18 13 14 15 14 18 A2 2 0 0 1 10 18" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" />
                                                        <path d="M10 9 A2 2 0 0 1 14 9" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
                                                    </svg>
                                                </div>
                                                {/* Göz (Basîr) */}
                                                <div className="w-6 h-6 flex items-center justify-center" title="Basîr: Her şeyi gören">
                                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                                                        <path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                                                        <circle cx="12" cy="12" r="3.5" fill="#0284c7" stroke="#0f172a" strokeWidth="1" />
                                                        <circle cx="13" cy="11" r="1" fill="#ffffff" />
                                                    </svg>
                                                </div>
                                                {/* Yaprak (Âlim / İlim) */}
                                                <div className="w-6 h-6 flex items-center justify-center" title="Âlim: Her şeyi bilen">
                                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                                                        <path d="M4 20 C8 12 16 6 22 2 C16 10 12 18 4 20 Z" fill="#4ade80" stroke="#0f172a" strokeWidth="1.5" />
                                                        <line x1="4" y1="20" x2="16" y2="8" stroke="#16a34a" strokeWidth="1" />
                                                    </svg>
                                                </div>
                                                {/* Anne ve Yavru Kuş (Rahmân & Rahîm) */}
                                                <div className="w-6 h-6 flex items-center justify-center" title="Rahmân & Rahîm: Merhamet eden">
                                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                                                        <path d="M4 14 Q8 8 16 10 Q20 12 18 16 Q14 18 10 18 Z" fill="#fed7aa" stroke="#0f172a" strokeWidth="1.2" />
                                                        <polygon points="18,12 22,11 18,14" fill="#f97316" />
                                                        <circle cx="15" cy="12" r="1" fill="#0f172a" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* İsimler ve Anlamları (6 Esma) */}
                                            <div className="space-y-1 flex-1 mt-1">
                                                {doodleData.box3.names.map((n, i) => (
                                                    <div key={i} className="text-[9.5px] leading-[1.2] flex items-start gap-1">
                                                        <span className="font-black text-[#15803d] min-w-[50px]">{n.name}:</span>
                                                        <span className="font-semibold text-[#334155]">{n.meaning}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ── KUTU 4: İHLAS SURESİ (ŞEFTALİ / PEMBE KART) ── */}
                                        <div className="border-[2.5px] border-[#fb923c] bg-[#fff7ed] rounded-2xl p-2.5 flex flex-col justify-between shadow-xs">
                                            {/* Başlık */}
                                            <div className="text-center font-black text-[#c2410c] text-[12px] leading-tight mb-1 border-b border-[#fed7aa] pb-1">
                                                {doodleData.box4.title}
                                            </div>

                                            {/* Kur'an ve Ayet Kartları Doodle */}
                                            <div className="flex items-center justify-around py-0.5 my-0.5 bg-white/70 rounded-xl border border-[#fed7aa]">
                                                {/* Yaldızlı Kur'an Kitabı */}
                                                <div className="w-8 h-7">
                                                    <svg viewBox="0 0 34 30" className="w-8 h-7" fill="none">
                                                        <rect x="6" y="4" width="22" height="22" rx="2" fill="#78350f" stroke="#0f172a" strokeWidth="1.5" />
                                                        <rect x="8" y="6" width="18" height="18" rx="1" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.8" />
                                                        <circle cx="17" cy="15" r="4" fill="#fde047" stroke="#78350f" strokeWidth="1" />
                                                        <rect x="4" y="4" width="3" height="22" rx="1" fill="#451a03" stroke="#0f172a" strokeWidth="1.2" />
                                                    </svg>
                                                </div>

                                                {/* 3 Adet Ayet Tableti */}
                                                <div className="flex items-center gap-1">
                                                    <div className="bg-[#fef9c3] border border-[#0f172a] rounded-md px-1.5 py-0.5 text-[8.5px] font-black shadow-xs">
                                                        1 • أَحَدٌ
                                                    </div>
                                                    <div className="bg-[#e0f2fe] border border-[#0f172a] rounded-md px-1.5 py-0.5 text-[8.5px] font-black shadow-xs">
                                                        2 • الصَّمَدُ
                                                    </div>
                                                    <div className="bg-[#fee2e2] border border-[#0f172a] rounded-md px-1.5 py-0.5 text-[8.5px] font-black shadow-xs">
                                                        3-4 • كُفُوًا
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Ayet Anlamları */}
                                            <div className="space-y-1.5 flex-1 mt-1">
                                                {doodleData.box4.bullets.map((b, i) => (
                                                    <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1.5">
                                                        <span className="text-[#ea580c] font-black text-xs flex-shrink-0">•</span>
                                                        <span>{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ══ ALT ŞERİT: UNUTMA! KUTUSU & INSTAGRAM İMZASI ══ */}
                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#e2e8f0]">
                                        {/* Sol: Kesikli Çerçeveli Unutma! Kutusu */}
                                        <div className="border-[2px] border-dashed border-[#0f172a] bg-[#f8fafc] rounded-xl p-1.5 flex items-center gap-2 flex-1">
                                            <div className="bg-[#fde047] border-[1.5px] border-[#0f172a] rounded-lg px-2 py-0.5 transform -rotate-2 select-none flex-shrink-0">
                                                <span className="text-[11px] font-black text-[#0f172a]">Unutma!</span>
                                            </div>
                                            <div className="space-y-0.5 flex-1">
                                                {doodleData.unutmaBullets.map((b, i) => (
                                                    <div key={i} className="text-[9px] font-bold text-[#1e293b] leading-[1.2] flex items-start gap-1">
                                                        <span className="text-emerald-600 font-black text-xs flex-shrink-0">☑</span>
                                                        <span>{b}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sağ: Instagram Sosyal Medya Rozeti */}
                                        <div className="bg-[#0f172a] text-[#ffffff] border-[1.5px] border-[#0f172a] rounded-xl px-2.5 py-1.5 flex items-center gap-1 shadow-xs flex-shrink-0">
                                            <span className="text-[10px] font-black tracking-wide">{doodleData.handle}</span>
                                            <span className="text-amber-400 text-xs">✨</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ═══════════════════════════════════════════════════════════════════ */}
                            {/* 2. ŞABLON: 6. SINIF YAZILI VAKTİ (6 KART + TABLO DÜZENİ) */}
                            {/* ═══════════════════════════════════════════════════════════════════ */}
                            {activeTemplate === 'yazilivakti6' && (
                                <div
                                    ref={captureRef}
                                    className="w-[540px] h-[675px] bg-[#ffffff] rounded-xl shadow-xl overflow-hidden flex flex-col justify-between relative select-none p-3"
                                    style={{
                                        fontFamily: "'Fredoka', 'Nunito', 'Plus Jakarta Sans', sans-serif",
                                        boxSizing: 'border-box',
                                        color: '#0f172a'
                                    }}
                                >
                                    {/* ══ 1. ÜST BAŞLIK ALANI ══ */}
                                    <div className="flex items-center justify-between relative flex-shrink-0 pt-0.5 pb-1">
                                        <div 
                                            className="bg-[#fde047] border-[2px] border-[#000000] rounded-2xl px-2.5 py-1 text-center shadow-xs transform -rotate-3 select-none flex-shrink-0"
                                            style={{ width: '105px' }}
                                        >
                                            <div className="text-[10px] font-black leading-tight text-[#000000] whitespace-pre-line">
                                                {sheetData.gradeTag}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center text-center relative z-10 flex-1 px-1">
                                            <div className="text-[23px] font-black tracking-tight text-[#0f172a] leading-none mb-0.5 flex items-center gap-1.5 drop-shadow-xs">
                                                <span className="text-pink-500 text-sm">✨</span>
                                                <span className="tracking-wider">YAZILI VAKTİ</span>
                                                <span className="text-pink-500 text-sm">✨</span>
                                            </div>
                                            <div className="bg-[#f3e8ff] border-[1.5px] border-[#a855f7] text-[#6b21a8] text-[9.5px] font-black px-3 py-0.2 rounded-full uppercase tracking-wider mb-0.5">
                                                {sheetData.unitTag}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-pink-500 text-xs font-black">❯</span>
                                                <div className="bg-[#e0f2fe] border-[2px] border-[#0284c7] text-[#0369a1] text-[12.5px] font-black px-4 py-0.5 rounded-full shadow-xs truncate max-w-[280px]">
                                                    {sheetData.topicTitle}
                                                </div>
                                                <span className="text-pink-500 text-xs font-black">❮</span>
                                            </div>
                                            <div className="bg-[#fce7f3] border border-[#ec4899] text-[#be185d] text-[8.5px] font-black px-3 py-0.2 rounded-full mt-0.5">
                                                {sheetData.subTitle}
                                            </div>
                                        </div>

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

                                    {/* ══ SATIR 1: KART 1 & KART 2 ══ */}
                                    <div className="grid grid-cols-2 gap-2.5 my-1">
                                        <div className="border-[2px] border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 relative flex flex-col justify-between">
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bae6fd] border-[2px] border-[#0284c7] text-[#0369a1] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                {sheetData.card1.title}
                                            </div>
                                            <div className="flex items-center justify-between gap-1 mt-2.5">
                                                <div className="space-y-1 flex-1">
                                                    {sheetData.card1.bullets.map((b, i) => (
                                                        <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.2] flex items-start gap-1.5">
                                                            <span className="text-[#ec4899] text-xs font-black flex-shrink-0">•</span>
                                                            <span>{b}</span>
                                                        </div>
                                                    ))}
                                                </div>
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

                                        <div className="border-[2px] border-[#facc15] bg-[#fefce8] rounded-2xl p-2 relative flex flex-col justify-between">
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fef08a] border-[2px] border-[#ca8a04] text-[#854d0e] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                {sheetData.card2.title}
                                            </div>
                                            <div className="space-y-1 mt-2.5">
                                                {sheetData.card2.items.map((it, i) => (
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

                                    {/* ══ SATIR 2: KART 3 & KART 4 ══ */}
                                    <div className="grid grid-cols-2 gap-2.5 my-1">
                                        <div className="border-[2px] border-[#f472b6] bg-[#fdf2f8] rounded-2xl p-2 relative flex flex-col justify-between">
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fbcfe8] border-[2px] border-[#db2777] text-[#9d174d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                {sheetData.card3.title}
                                            </div>
                                            <div className="space-y-1 mt-2.5">
                                                {sheetData.card3.items.map((it, i) => (
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

                                        <div className="border-[2px] border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 relative flex flex-col justify-between">
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bae6fd] border-[2px] border-[#0284c7] text-[#0369a1] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                {sheetData.card4.title}
                                            </div>
                                            <div className="mt-2.5 space-y-1.5">
                                                <div className="flex items-center justify-between gap-1">
                                                    <div>
                                                        <div className="bg-[#fef08a] border border-[#ca8a04] text-[#854d0e] text-[9px] font-black px-2 py-0.2 rounded-full w-fit mb-0.5">
                                                            {sheetData.card4.sub1Title}
                                                        </div>
                                                        <p className="text-[9px] font-semibold text-[#334155] leading-[1.2]">
                                                            ➔ {sheetData.card4.sub1Text}
                                                        </p>
                                                    </div>
                                                    <div className="w-10 h-8 flex-shrink-0">
                                                        <svg viewBox="0 0 70 55" className="w-10 h-8" fill="none">
                                                            <path d="M15 50 L45 30 L55 50 M55 50 L25 30 L15 50" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
                                                            <path d="M12 28 Q35 34 35 38 Q35 34 58 28 L55 12 Q35 18 35 20 Q35 18 15 12 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="bg-[#ede9fe] border border-[#8b5cf6] text-[#6b21a8] text-[9px] font-black px-2 py-0.2 rounded-full w-fit mb-0.5">
                                                        {sheetData.card4.sub2Title}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        {sheetData.card4.sub2Bullets.map((b, i) => (
                                                            <div key={i} className="text-[9px] font-semibold text-[#334155] leading-[1.2] flex items-start gap-1">
                                                                <span className="text-emerald-600 font-black text-xs">✔</span>
                                                                <span>{b}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ══ SATIR 3: KART 5 & KART 6 ══ */}
                                    <div className="grid grid-cols-2 gap-2.5 my-1">
                                        <div className="border-[2px] border-[#4ade80] bg-[#f0fdf4] rounded-2xl p-2 relative flex flex-col justify-between">
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#bbf7d0] border-[2px] border-[#16a34a] text-[#14532d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                {sheetData.card5.title}
                                            </div>
                                            <div className="flex items-center justify-between gap-1 mt-2.5">
                                                <div className="space-y-1 flex-1">
                                                    {sheetData.card5.bullets.map((b, i) => (
                                                        <div key={i} className="text-[9.5px] font-semibold text-[#1e293b] leading-[1.25] flex items-start gap-1">
                                                            <span className="text-emerald-600 font-black text-xs">✔</span>
                                                            <span>{b}</span>
                                                        </div>
                                                    ))}
                                                </div>
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

                                        <div className="border-[2px] border-[#f472b6] bg-[#fdf2f8] rounded-2xl p-1.5 relative flex flex-col justify-between">
                                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#fbcfe8] border-[2px] border-[#db2777] text-[#9d174d] text-[10.5px] font-black px-3 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                                                {sheetData.card6.title}
                                            </div>
                                            <div className="mt-2.5 overflow-hidden rounded-xl border border-[#cbd5e1]">
                                                <table className="w-full text-center border-collapse">
                                                    <thead>
                                                        <tr className="bg-[#fef08a] text-[9.5px] font-black text-[#854d0e]">
                                                            <th className="py-1 border-r border-[#cbd5e1]">{sheetData.card6.col1Header}</th>
                                                            <th className="py-1">{sheetData.card6.col2Header}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-[9px] font-bold text-[#1e293b]">
                                                        {sheetData.card6.rows.map((r, i) => (
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

                                    {/* ══ SATIR 4: UNUTMA! ŞERİDİ ══ */}
                                    <div className="border-[2px] border-dashed border-[#38bdf8] bg-[#f0f9ff] rounded-2xl p-2 flex items-center justify-between gap-2 my-0.5">
                                        <div className="bg-[#fde047] border-[2px] border-[#000000] rounded-xl px-3 py-1 shadow-xs transform -rotate-3 select-none flex-shrink-0">
                                            <span className="text-[14px] font-black text-[#000000] tracking-tight">Unutma!</span>
                                        </div>
                                        <div className="space-y-0.5 flex-1 px-1">
                                            {sheetData.unutmaBullets.map((b, i) => (
                                                <div key={i} className="text-[9.5px] font-bold text-[#1e293b] leading-[1.25] flex items-start gap-1.5">
                                                    <span className="text-emerald-600 font-black text-xs">✔</span>
                                                    <span>{b}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="w-12 h-9 flex-shrink-0">
                                            <svg viewBox="0 0 70 55" className="w-12 h-9" fill="none">
                                                <path d="M15 50 L45 30 L55 50 M55 50 L25 30 L15 50" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
                                                <path d="M12 28 Q35 34 35 38 Q35 34 58 28 L55 12 Q35 18 35 20 Q35 18 15 12 Z" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* ══ EN ALT İMZA BARI ══ */}
                                    <div className="flex items-center justify-end pt-0.5">
                                        <span className="bg-[#ede9fe] text-[#7c3aed] text-[9.5px] font-black px-2.5 py-0.5 rounded-full border border-[#c4b5fd]">
                                            @dindersiatolyesi
                                        </span>
                                    </div>
                                </div>
                            )}
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
                                        onClick={() => {
                                            if (activeTemplate === 'doodle4') setDoodleData(initialDoodleData);
                                            else setSheetData(initialSheetData);
                                        }}
                                        className="h-7 text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                        title="Orijinal içeriğe geri dön"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Sıfırla
                                    </Button>
                                </div>

                                {activeTemplate === 'doodle4' ? (
                                    <>
                                        {/* 5. Sınıf Doodle Düzenleme Alanları */}
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-300">Ana Üst Başlık:</label>
                                            <input 
                                                type="text"
                                                value={doodleData.topBanner}
                                                onChange={e => setDoodleData(prev => ({ ...prev, topBanner: e.target.value }))}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-300">Ünite Başlığı:</label>
                                            <input 
                                                type="text"
                                                value={doodleData.unitTag}
                                                onChange={e => setDoodleData(prev => ({ ...prev, unitTag: e.target.value }))}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                            />
                                        </div>

                                        {/* Kutu 1 */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                            <label className="font-bold text-sky-300 block">1. Kutu: {doodleData.box1.title}</label>
                                            <input 
                                                type="text"
                                                value={doodleData.box1.title}
                                                onChange={e => setDoodleData(prev => ({ ...prev, box1: { ...prev.box1, title: e.target.value } }))}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold mb-1"
                                            />
                                            {doodleData.box1.bullets.map((b, i) => (
                                                <input 
                                                    key={i}
                                                    type="text"
                                                    value={b}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setDoodleData(prev => {
                                                            const next = [...prev.box1.bullets];
                                                            next[i] = val;
                                                            return { ...prev, box1: { ...prev.box1, bullets: next } };
                                                        });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px] mb-1"
                                                />
                                            ))}
                                        </div>

                                        {/* Kutu 2 */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                            <label className="font-bold text-amber-300 block">2. Kutu: {doodleData.box2.title}</label>
                                            <input 
                                                type="text"
                                                value={doodleData.box2.title}
                                                onChange={e => setDoodleData(prev => ({ ...prev, box2: { ...prev.box2, title: e.target.value } }))}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold mb-1"
                                            />
                                            {doodleData.box2.bullets.map((b, i) => (
                                                <input 
                                                    key={i}
                                                    type="text"
                                                    value={b}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setDoodleData(prev => {
                                                            const next = [...prev.box2.bullets];
                                                            next[i] = val;
                                                            return { ...prev, box2: { ...prev.box2, bullets: next } };
                                                        });
                                                    }}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px] mb-1"
                                                />
                                            ))}
                                        </div>

                                        {/* Kutu 3 (Esma-i Hüsna) */}
                                        <div className="space-y-1.5 pt-2 border-t border-slate-800">
                                            <label className="font-bold text-emerald-300 block">3. Kutu: {doodleData.box3.title}</label>
                                            {doodleData.box3.names.map((n, i) => (
                                                <div key={i} className="flex gap-1.5 mb-1">
                                                    <input 
                                                        type="text"
                                                        value={n.name}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setDoodleData(prev => {
                                                                const next = [...prev.box3.names];
                                                                next[i] = { ...next[i], name: val };
                                                                return { ...prev, box3: { ...prev.box3, names: next } };
                                                            });
                                                        }}
                                                        className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold text-[11px]"
                                                    />
                                                    <input 
                                                        type="text"
                                                        value={n.meaning}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setDoodleData(prev => {
                                                                const next = [...prev.box3.names];
                                                                next[i] = { ...next[i], meaning: val };
                                                                return { ...prev, box3: { ...prev.box3, names: next } };
                                                            });
                                                        }}
                                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[11px]"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* 6. Sınıf Klasik Düzenleme Alanları */}
                                        <div className="space-y-1">
                                            <label className="font-bold text-slate-300">Ana Konu Başlığı:</label>
                                            <input 
                                                type="text"
                                                value={sheetData.topicTitle}
                                                onChange={e => setSheetData(prev => ({ ...prev, topicTitle: e.target.value }))}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-bold text-cyan-300 block">1. Kart: {sheetData.card1.title}</label>
                                            <input 
                                                type="text"
                                                value={sheetData.card1.title}
                                                onChange={e => setSheetData(prev => ({ ...prev, card1: { ...prev.card1, title: e.target.value } }))}
                                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white font-bold mb-1"
                                            />
                                        </div>
                                    </>
                                )}

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
                                            className="h-6 px-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                        >
                                            {isCopied ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                                            {isCopied ? 'Kopyalandı' : 'Metni Kopyala'}
                                        </Button>
                                    </div>
                                    <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 max-h-52 overflow-y-auto text-xs font-sans text-slate-300 leading-relaxed whitespace-pre-wrap select-text scrollbar-thin">
                                        {captionText}
                                    </div>
                                </div>

                                {/* Şablon Seçme & Önizleme Bilgisi */}
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-xs text-emerald-200 space-y-1.5">
                                    <div className="font-extrabold flex items-center justify-between text-emerald-300">
                                        <div className="flex items-center gap-1.5">
                                            <span>🎨</span>
                                            <span>{activeTemplate === 'doodle4' ? '5. Sınıf Doodle Şablonu (4 Kart)' : '6. Sınıf İnfografik Şablonu (6 Kart)'}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setActiveTemplate(prev => prev === 'doodle4' ? 'yazilivakti6' : 'doodle4')}
                                            className="h-6 text-[11px] px-2 bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 cursor-pointer"
                                        >
                                            <Palette className="w-3 h-3 mr-1" />
                                            Diğer Şablona Geç
                                        </Button>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-emerald-100/90">
                                        {activeTemplate === 'doodle4' 
                                            ? 'Doodle tarzı sevimli çizimler (Dünya, Güneş, Ağaç, Büyüteç, Terazi, Semî/Basîr simgeleri, İhlas Suresi ve Unutma şeridi).' 
                                            : '2 sütunlu infografik düzeni (Mescid-i Nebevi yeşil kubbesi, Peygamberlerin görevleri rozetleri, Dört Kitap tablosu).'}
                                    </p>
                                </div>

                                {/* Yapay Zeka Çizim Versiyonunu İndir */}
                                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-pink-400" />
                                        <span>Yapay Zeka İllüstrasyonu (Poster):</span>
                                    </div>
                                    <a
                                        href="/images/instagram/5_sinif_allah_inanci_yazili_vakti.jpg"
                                        download="5_Sinif_Allah_Inanci_Yazili_Vakti_AI.jpg"
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 px-2.5 py-1 rounded-lg border border-pink-500/30 transition-colors"
                                    >
                                        <Download className="w-3 h-3" />
                                        <span>AI Görseli İndir (JPG)</span>
                                    </a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
