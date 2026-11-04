'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Instagram, Download, Copy, Check, ChevronLeft, ChevronRight, 
    Sparkles, Layers, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { NOTEBOOK_SHEET_CSS } from '@/lib/notebook-sheet-template';

interface InstagramCarouselModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    htmlContent: string;
    grade?: string;
    courseName?: string;
    unitName?: string;
}

export interface InstagramSlide {
    id: string;
    type: 'cover' | 'concepts' | 'content-1' | 'content-2' | 'traps' | 'outro';
    title: string;
    badgeText: string;
    colorTheme: string;
    html: string;
}

/**
 * HTML öğelerini Instagram 4:5 formatı için temizler:
 * - html2canvas'ta metnin üstünü kapatan sarı <mark> arkaplan hatasını çözer
 * - Gereksiz buton ve araç çubuklarını temizler
 */
function cleanElementForInstagram(el: HTMLElement) {
    // 1. Zoom butonları ve print çubuklarını kaldır
    el.querySelectorAll('.sb-zoom-trigger-btn, .toolbar, .print-btn').forEach(btn => btn.remove());

    // 2. <mark>, .highlight, .hl-yellow öğelerindeki inline arkaplanı kaldır
    el.querySelectorAll('mark, .highlight, .hl-yellow').forEach(m => {
        const span = document.createElement('span');
        span.className = 'ig-hl';
        span.textContent = m.textContent || '';
        m.replaceWith(span);
    });

    // 3. Stilleri resetle
    el.style.margin = '0';
    el.style.maxWidth = '100%';
}

export function InstagramCarouselModal({
    isOpen,
    onClose,
    title,
    htmlContent,
    grade,
}: InstagramCarouselModalProps) {
    const { toast } = useToast();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const slideCaptureRef = useRef<HTMLDivElement>(null);

    // 1. HTML İçeriğini 4:5 Instagram Slaytlarına Akıllı Parçala
    const slides = useMemo<InstagramSlide[]>(() => {
        if (!htmlContent) return [];

        const parser = typeof window !== 'undefined' ? new DOMParser() : null;
        if (!parser) return [];

        const doc = parser.parseFromString(htmlContent, 'text/html');
        const generatedSlides: InstagramSlide[] = [];

        // Başlık / Üstbilgi tespiti
        const headerTitleEl = doc.querySelector('.title-banner, .unit-banner, h1, h2');
        const mainTitle = headerTitleEl ? headerTitleEl.textContent?.trim() : title;
        const gradeBadge = doc.querySelector('.badge-grade')?.textContent?.trim() || (grade ? `★ ${grade}. Sınıf Din Kültürü` : '★ Din Kültürü');

        // 1. SLAYT: KAPAK + KAVRAMLAR KUTUSU
        const yellowBox = doc.querySelector('.box-yellow, section.box-yellow, .card-yellow');
        if (yellowBox) {
            const clone = yellowBox.cloneNode(true) as HTMLElement;
            cleanElementForInstagram(clone);
            
            generatedSlides.push({
                id: 'concepts',
                type: 'concepts',
                title: 'Temel Kavramlar',
                badgeText: '📌 Slayt 1: Anahtar Kavramlar',
                colorTheme: 'from-amber-400 to-yellow-500',
                html: `
                    <div class="ig-top-info">
                        <div class="ig-cover-badge">${gradeBadge}</div>
                        <h2 class="ig-cover-title">${mainTitle}</h2>
                    </div>
                    <div class="ig-divider"></div>
                    ${clone.outerHTML}
                `
            });
        }

        // 2 & 3. SLAYT: KONU DETAYLARI (Mavi ve Pembe vb. kutular)
        const detailBoxes = Array.from(doc.querySelectorAll('.box-cyan, .box-pink, .box-purple, .box-orange, section.box:not(.box-yellow):not(.box-green)'));
        
        detailBoxes.forEach((boxEl, idx) => {
            const clone = boxEl.cloneNode(true) as HTMLElement;
            cleanElementForInstagram(clone);
            const boxTitle = clone.querySelector('.box-title, .card-title, h3, strong')?.textContent?.trim() || `Konu Detayı ${idx + 1}`;

            generatedSlides.push({
                id: `content-${idx + 1}`,
                type: idx === 0 ? 'content-1' : 'content-2',
                title: boxTitle.replace(/^[📖🏔️⏳⚡⭐🎨🌱]\s*/, '').slice(0, 30),
                badgeText: `📌 Slayt ${generatedSlides.length + 1}: Konu Anlatımı`,
                colorTheme: idx === 0 ? 'from-sky-500 to-blue-600' : 'from-pink-500 to-rose-600',
                html: `
                    <div class="ig-top-info">
                        <div class="ig-cover-badge">${gradeBadge}</div>
                        <h3 class="ig-sub-title">${mainTitle}</h3>
                    </div>
                    <div class="ig-divider"></div>
                    ${clone.outerHTML}
                `
            });
        });

        // 4. SLAYT: KRİTİK NOKTALAR & EN ÇOK KARIŞTIRILANLAR (Yeşil Kutu)
        const greenBox = doc.querySelector('.box-green, section.box-green, .card-green');
        if (greenBox) {
            const clone = greenBox.cloneNode(true) as HTMLElement;
            cleanElementForInstagram(clone);

            generatedSlides.push({
                id: 'traps',
                type: 'traps',
                title: 'Kritik Noktalar',
                badgeText: `📌 Slayt ${generatedSlides.length + 1}: Dikkat Noktaları`,
                colorTheme: 'from-emerald-500 to-teal-600',
                html: `
                    <div class="ig-top-info">
                        <div class="ig-cover-badge">${gradeBadge}</div>
                        <h3 class="ig-sub-title">${mainTitle}</h3>
                    </div>
                    <div class="ig-divider"></div>
                    ${clone.outerHTML}
                `
            });
        }

        // 5. SLAYT: ŞIK KAPANIŞ & ETKİLEŞİM SLAYTI (Call To Action)
        generatedSlides.push({
            id: 'outro',
            type: 'outro',
            title: 'Kaydet & Paylaş',
            badgeText: `📌 Slayt ${generatedSlides.length + 1}: Kapanış`,
            colorTheme: 'from-purple-600 to-indigo-600',
            html: `
                <div class="ig-outro-wrap">
                    <div class="ig-outro-icon">🕌</div>
                    <h2 class="ig-outro-brand">DinDersi Atölyesi</h2>
                    <p class="ig-outro-tagline">MEB Müfredatına Tam Uyumlu Özgün Ders Notları & Eğitici Oyunlar</p>

                    <div class="ig-outro-box">
                        <div class="ig-outro-step">
                            <span class="ig-step-num">1</span>
                            <div><strong>Kaydet 💾:</strong> Tekrar etmek için bu gönderiyi kaydetmeyi unutma!</div>
                        </div>
                        <div class="ig-outro-step">
                            <span class="ig-step-num">2</span>
                            <div><strong>Arkadaşınla Paylaş 🚀:</strong> Sınıf arkadaşlarına gönder, birlikte öğrenin!</div>
                        </div>
                        <div class="ig-outro-step">
                            <span class="ig-step-num">3</span>
                            <div><strong>Oyunları Oyna 🎮:</strong> Bu konunun interaktif oyunlarını oynamak için profildeki linke tıkla!</div>
                        </div>
                    </div>

                    <div class="ig-outro-footer">
                        <span>📲 @dindersiatolyesi</span>
                        <span>•</span>
                        <span>dindersiatolyesi.com</span>
                    </div>
                </div>
            `
        });

        return generatedSlides;
    }, [htmlContent, title, grade]);

    // Hazır Instagram Açıklama Metni (Caption)
    const captionText = useMemo(() => {
        return `📌 ${title} | Renkli Ders Notu & Kavramlar 📖✨\n\n` +
            `Tüm kilit kavramlar, önemli konu maddeleri ve en çok karıştırılan kritik noktalar bu seride! 💡\n\n` +
            `👉 Sola kaydırarak tüm sayfaları tek tek inceleyebilirsiniz.\n` +
            `💾 Ders öncesi hızlıca tekrar etmek için bu gönderiyi KAYDET'e basmayı unutmayın!\n` +
            `👥 Sınıf arkadaşlarınla paylaşarak onların da öğrenmesine vesile olabilirsin. 🚀\n\n` +
            `📲 Bu ünitenin interaktif eğlenceli oyunlarını ücretsiz oynamak için profilimizdeki linke tıklayın!\n\n` +
            `#dinkültürü #dersnotu #özet #ortaokul #dindersiatolyesi #dinbilgisi #hafız #meb #öğretmen #öğrenci`;
    }, [title]);

    const handleCopyCaption = useCallback(() => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(captionText);
            setIsCopied(true);
            toast({
                title: 'Kopyalandı! 📋',
                description: 'Instagram açıklama metni ve etiketler panoya kopyalandı.',
            });
            setTimeout(() => setIsCopied(false), 2500);
        }
    }, [captionText, toast]);

    // Tekli Slayt İndir (PNG - 1080x1350 px)
    const handleDownloadCurrentSlide = async () => {
        if (!slideCaptureRef.current) return;
        setIsExporting(true);

        // html2canvas FontMetrics baseline bug fix (GitHub Issue #2775: Tailwind img display:block causes downward text shift)
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
                scale: 2.5, // 440px * 2.5 = 1100px (1080x1350 Instagram dikey standardı)
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
            link.download = `${title.replace(/\s+/g, '_')}_Slayt_${currentIndex + 1}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast({
                title: 'Slayt İndirildi! 🎉',
                description: `${currentIndex + 1}. slayt yüksek çözünürlüklü Instagram formatında (PNG) kaydedildi.`,
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

    // Tüm Slaytları Sırayla İndir
    const handleDownloadAllSlides = async () => {
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
            const html2canvas = (await import('html2canvas')).default;
            const total = slides.length;

            for (let i = 0; i < total; i++) {
                setExportProgress(`Slayt ${i + 1} / ${total} hazırlanıyor...`);
                setCurrentIndex(i);
                
                // DOM'un render olması için bekleme
                await new Promise(r => setTimeout(r, 400));

                if (slideCaptureRef.current) {
                    if (typeof document !== 'undefined' && document.fonts) {
                        await document.fonts.ready;
                    }
                    const canvas = await html2canvas(slideCaptureRef.current, {
                        scale: 2.5,
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
                    link.download = `${title.replace(/\s+/g, '_')}_Instagram_Slayt_${i + 1}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                    
                    await new Promise(r => setTimeout(r, 250));
                }
            }

            toast({
                title: 'Tüm Slaytlar İndirildi! 🚀',
                description: `Toplam ${total} adet Instagram gönderi görseli başarıyla bilgisayarınıza indirildi.`,
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

    if (!isOpen || slides.length === 0) return null;

    const currentSlide = slides[currentIndex] || slides[0];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl w-[96vw] bg-slate-950 border border-slate-800 text-white rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
                {/* Google Fonts Preconnect & Stylesheet */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Patrick+Hand&display=swap" rel="stylesheet" />

                <DialogHeader className="pb-3 border-b border-slate-800 flex-shrink-0 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-pink-900/40 flex-shrink-0">
                            <Instagram className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                                <span>Instagram Carousel Stüdyosu (4:5)</span>
                                <Badge className="bg-pink-500/20 text-pink-300 border-pink-400/30 text-[10px] hidden sm:inline-flex">
                                    Otomatik 1080x1350
                                </Badge>
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-400 truncate">
                                {title} • Slaytlar Instagram dikey 4:5 oranına göre tam sığdırılır
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
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
                            onClick={handleDownloadCurrentSlide}
                            disabled={isExporting}
                            className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold h-9 px-3 flex items-center gap-1.5 shadow-md cursor-pointer"
                            title="Şu anki slaytı PNG olarak kaydet"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Bu Slaytı İndir</span>
                        </Button>

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
                                    <span>Tümünü İndir ({slides.length})</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogHeader>

                {/* Ana Çalışma Alanı: Sol tarafta 4:5 Önizleme, Sağ tarafta Slayt Listesi ve Açıklama */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row items-center justify-center gap-4 py-3 overflow-hidden">
                    
                    {/* SOL: 4:5 Dikey Instagram Önizleme Kartı */}
                    <div className="flex flex-col items-center justify-center h-full max-h-full">
                        
                        {/* 4:5 Dikey Tuval Çerçevesi (Ekran Önizlemesi) */}
                        <div className="relative p-1.5 rounded-[1.75rem] bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                            
                            {/* Gerçek Ekran Görüntüsü Alınacak Çerçeve (440 x 550 px - Sabit 4:5 Oran) */}
                            <div
                                ref={slideCaptureRef}
                                className="w-[440px] h-[550px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col justify-between text-slate-900 relative select-none"
                                style={{
                                    fontFamily: "'Patrick Hand', 'Neucha', cursive, sans-serif",
                                    boxSizing: 'border-box'
                                }}
                            >
                                {/* Dahili CSS kuralları (Instagram 4:5 optimizasyonu) */}
                                <style dangerouslySetInnerHTML={{ __html: NOTEBOOK_SHEET_CSS + `
                                    @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Patrick+Hand&display=swap');

                                    /* Üst Bar */
                                    .ig-slide-header {
                                        display: flex;
                                        align-items: center;
                                        justify-content: space-between;
                                        padding: 10px 16px;
                                        background: #f8fafc;
                                        border-bottom: 1.5px dashed #cbd5e1;
                                        font-size: 13px;
                                        font-weight: 800;
                                        flex-shrink: 0;
                                    }
                                    .ig-slide-brand {
                                        color: #0284c7;
                                        display: flex;
                                        align-items: center;
                                        gap: 6px;
                                        font-weight: 800;
                                    }
                                    .ig-slide-step {
                                        background: #e0f2fe;
                                        color: #0369a1;
                                        padding: 2px 8px;
                                        border-radius: 8px;
                                        font-size: 12px;
                                        font-weight: 800;
                                    }

                                    /* Gövde - Dikeyde tam yayılır (space-between), alt boşluk kalmaz */
                                    .ig-slide-body {
                                        flex: 1;
                                        padding: 12px 16px;
                                        overflow: hidden;
                                        display: flex;
                                        flex-direction: column;
                                        justify-content: space-between;
                                        box-sizing: border-box;
                                        width: 100%;
                                        height: 100%;
                                    }

                                    /* Üst Bilgiler */
                                    .ig-top-info {
                                        display: flex;
                                        flex-direction: column;
                                        align-items: flex-start;
                                        margin-bottom: 4px;
                                        padding-top: 2px;
                                        flex-shrink: 0;
                                    }
                                    .ig-cover-badge {
                                        background: #fef08a;
                                        color: #854d0e;
                                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                                        font-weight: 800;
                                        font-size: 11.5px;
                                        padding: 2.5px 10px;
                                        border-radius: 12px;
                                        display: inline-flex;
                                        align-items: center;
                                        justify-content: center;
                                        margin-bottom: 4px;
                                        border: 1.5px solid #ca8a04;
                                        width: fit-content;
                                        line-height: 1.2;
                                    }
                                    .ig-cover-title {
                                        font-family: 'Caveat', cursive !important;
                                        font-size: 23px;
                                        font-weight: 700;
                                        color: #0f172a;
                                        line-height: 1.2;
                                        margin: 0;
                                        letter-spacing: -0.2px;
                                    }
                                    .ig-sub-title {
                                        font-family: 'Caveat', cursive !important;
                                        font-size: 20px;
                                        font-weight: 700;
                                        color: #0f172a;
                                        line-height: 1.2;
                                        margin: 0;
                                    }
                                    .ig-divider {
                                        width: 100%;
                                        height: 1px;
                                        border-top: 1.5px dashed #e2e8f0;
                                        margin: 6px 0 8px 0;
                                        flex-shrink: 0;
                                    }

                                    /* Alt Bar */
                                    .ig-slide-footer {
                                        padding: 9px 16px;
                                        background: #f8fafc;
                                        border-top: 1.5px dashed #cbd5e1;
                                        display: flex;
                                        align-items: center;
                                        justify-content: space-between;
                                        font-size: 12.5px;
                                        color: #64748b;
                                        font-weight: bold;
                                        flex-shrink: 0;
                                    }
                                    .ig-save-pill {
                                        background: #fdf2f8;
                                        color: #db2777;
                                        padding: 2px 9px;
                                        border-radius: 8px;
                                        border: 1px solid #f472b6;
                                        font-weight: 800;
                                    }

                                    /* VURGULAR (<mark>): Asla sarı arka plan yok, şık renkli ve altı çizili */
                                    .ig-slide-body mark,
                                    .ig-slide-body .highlight,
                                    .ig-slide-body .hl-yellow,
                                    .ig-hl {
                                        background: transparent !important;
                                        background-color: transparent !important;
                                        color: #c2410c !important;
                                        font-weight: 800 !important;
                                        padding: 0 !important;
                                        margin: 0 !important;
                                        border: none !important;
                                        border-radius: 0 !important;
                                        box-shadow: none !important;
                                        text-decoration: underline !important;
                                        text-decoration-color: #ea580c !important;
                                        text-underline-offset: 2.5px !important;
                                        display: inline !important;
                                    }

                                    /* KUTU GENEL STİLLERİ: Slaytı tam boy kaplar */
                                    .ig-slide-body .box {
                                        flex: 1;
                                        display: flex !important;
                                        flex-direction: column !important;
                                        justify-content: space-between !important;
                                        padding: 12px 14px !important;
                                        margin: 0 !important;
                                        border-width: 2.5px !important;
                                        border-radius: 16px !important;
                                        box-shadow: 2px 3px 0 rgba(0,0,0,0.06) !important;
                                        box-sizing: border-box !important;
                                        overflow: visible !important;
                                    }
                                    .ig-slide-body .box-title {
                                        font-family: 'Caveat', cursive !important;
                                        font-size: 21px !important;
                                        font-weight: 700 !important;
                                        margin-bottom: 8px !important;
                                        display: flex !important;
                                        align-items: center !important;
                                        justify-content: space-between !important;
                                        line-height: 1.2 !important;
                                        flex-shrink: 0 !important;
                                    }
                                    .ig-slide-body .tag-exam,
                                    .ig-slide-body .tag-highlight {
                                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                                        font-size: 11px !important;
                                        font-weight: 800 !important;
                                        padding: 2.5px 9px !important;
                                        border-radius: 12px !important;
                                        box-shadow: 1px 1px 0 rgba(0,0,0,0.15) !important;
                                        margin: 0 !important;
                                        line-height: 1.2 !important;
                                        display: inline-flex !important;
                                        align-items: center !important;
                                        justify-content: center !important;
                                        background: #ef4444 !important;
                                        color: #ffffff !important;
                                        border: none !important;
                                        flex-shrink: 0 !important;
                                    }

                                    /* 1. SLAYT: KAVRAMLAR KUTUSU (2 SÜTUN x 3 SATIR - Tam Yükseklik) */
                                    .ig-slide-body .concepts-grid {
                                        flex: 1;
                                        display: grid !important;
                                        grid-template-columns: repeat(2, 1fr) !important;
                                        grid-template-rows: repeat(3, 1fr) !important;
                                        gap: 8px !important;
                                        width: 100% !important;
                                        box-sizing: border-box !important;
                                    }
                                    .ig-slide-body .concept-card,
                                    .ig-slide-body .concept-item {
                                        background: #ffffff !important;
                                        border: 1.5px solid #fde047 !important;
                                        border-radius: 12px !important;
                                        padding: 8px 10px !important;
                                        display: flex !important;
                                        flex-direction: column !important;
                                        justify-content: center !important;
                                        gap: 4px !important;
                                        box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important;
                                        box-sizing: border-box !important;
                                        height: 100% !important;
                                        min-height: 0 !important;
                                        overflow: hidden !important;
                                    }
                                    .ig-slide-body .concept-badge,
                                    .ig-slide-body .c-tag {
                                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
                                        font-size: 12px !important;
                                        font-weight: 800 !important;
                                        padding: 2.5px 10px !important;
                                        border-radius: 12px !important;
                                        border-width: 1.5px !important;
                                        border-style: solid !important;
                                        display: inline-flex !important;
                                        align-items: center !important;
                                        justify-content: center !important;
                                        line-height: 1.2 !important;
                                        margin-bottom: 2px !important;
                                        width: fit-content !important;
                                        box-sizing: border-box !important;
                                    }
                                    .ig-slide-body .concept-card p,
                                    .ig-slide-body .concept-item p {
                                        font-size: 13px !important;
                                        line-height: 1.35 !important;
                                        color: #1e293b !important;
                                        margin: 0 !important;
                                    }

                                    /* 2 & 3. SLAYT: KONU LİSTELERİ */
                                    .ig-slide-body .columns-2 {
                                        flex: 1;
                                        display: flex !important;
                                        flex-direction: column !important;
                                    }
                                    .ig-slide-body .box-cyan,
                                    .ig-slide-body .box-pink {
                                        flex: 1;
                                        display: flex !important;
                                        flex-direction: column !important;
                                        justify-content: space-between !important;
                                    }
                                    .ig-slide-body .list-item {
                                        font-size: 13.5px !important;
                                        line-height: 1.4 !important;
                                        margin-bottom: 8px !important;
                                        display: flex !important;
                                        align-items: flex-start !important;
                                        gap: 9px !important;
                                    }
                                    .ig-slide-body .list-item:last-child {
                                        margin-bottom: 0 !important;
                                    }
                                    .ig-slide-body .bullet-num {
                                        width: 22px !important;
                                        height: 22px !important;
                                        min-width: 22px !important;
                                        border-radius: 50% !important;
                                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                                        font-size: 12px !important;
                                        font-weight: 900 !important;
                                        display: flex !important;
                                        align-items: center !important;
                                        justify-content: center !important;
                                        line-height: 1 !important;
                                        margin-top: 1px !important;
                                        box-shadow: none !important;
                                    }

                                    /* 4. SLAYT: KRİTİK NOKTALAR */
                                    .ig-slide-body .box-green {
                                        flex: 1;
                                        display: flex !important;
                                        flex-direction: column !important;
                                        justify-content: space-between !important;
                                    }
                                    .ig-slide-body .traps-grid {
                                        flex: 1;
                                        display: flex !important;
                                        flex-direction: column !important;
                                        justify-content: space-around !important;
                                        gap: 8px !important;
                                    }
                                    .ig-slide-body .trap-card {
                                        background: #ffffff !important;
                                        border: 1.5px solid #86efac !important;
                                        border-radius: 12px !important;
                                        padding: 10px 14px !important;
                                        font-size: 13.5px !important;
                                        line-height: 1.4 !important;
                                        color: #1e293b !important;
                                    }
                                    .ig-slide-body .trap-card strong {
                                        font-family: 'Caveat', cursive !important;
                                        font-size: 17px !important;
                                        color: #15803d !important;
                                        display: block !important;
                                        margin-bottom: 3px !important;
                                    }

                                    /* 5. SLAYT: OUTRO TASARIMI */
                                    .ig-outro-wrap {
                                        flex: 1;
                                        display: flex !important;
                                        flex-direction: column !important;
                                        align-items: center !important;
                                        justify-content: center !important;
                                        text-align: center !important;
                                        padding: 10px;
                                        height: 100%;
                                    }
                                    .ig-outro-icon {
                                        font-size: 40px;
                                        margin-bottom: 4px;
                                    }
                                    .ig-outro-brand {
                                        font-family: 'Caveat', cursive !important;
                                        font-size: 32px;
                                        font-weight: 900;
                                        color: #0284c7;
                                        line-height: 1;
                                        margin-bottom: 4px;
                                    }
                                    .ig-outro-tagline {
                                        font-size: 13px;
                                        color: #64748b;
                                        margin-bottom: 14px;
                                        max-width: 360px;
                                    }
                                    .ig-outro-box {
                                        width: 100%;
                                        background: #f8fafc;
                                        border: 2px dashed #cbd5e1;
                                        border-radius: 16px;
                                        padding: 12px 16px;
                                        display: flex;
                                        flex-direction: column;
                                        gap: 8px;
                                        text-align: left;
                                        font-size: 13px;
                                        margin-bottom: 14px;
                                    }
                                    .ig-outro-step {
                                        display: flex;
                                        align-items: center;
                                        gap: 10px;
                                    }
                                    .ig-step-num {
                                        width: 22px;
                                        height: 22px;
                                        background: #0284c7;
                                        color: #fff;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        font-weight: bold;
                                        font-size: 12px;
                                        flex-shrink: 0;
                                    }
                                    .ig-outro-footer {
                                        display: flex;
                                        align-items: center;
                                        gap: 8px;
                                        font-weight: 800;
                                        font-size: 13px;
                                        color: #0284c7;
                                    }
                                ` }} />

                                {/* Üst Bilgi Barı */}
                                <div className="ig-slide-header">
                                    <div className="ig-slide-brand">
                                        <span>🕌</span>
                                        <span>DinDersi Atölyesi</span>
                                    </div>
                                    <div className="ig-slide-step">
                                        {currentIndex + 1} / {slides.length}
                                    </div>
                                </div>

                                {/* Slayt Gövdesi */}
                                <div 
                                    className="ig-slide-body"
                                    dangerouslySetInnerHTML={{ __html: currentSlide.html }}
                                />

                                {/* Alt Bilgi Barı */}
                                <div className="ig-slide-footer">
                                    <span>📲 @dindersiatolyesi</span>
                                    <span className="ig-save-pill">Kaydet 💾</span>
                                </div>
                            </div>
                        </div>

                        {/* Slayt Geçiş Butonları */}
                        <div className="flex items-center gap-3 mt-3">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentIndex === 0}
                                className="h-8 px-3 rounded-xl border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Önceki
                            </Button>

                            {/* Nokta Göstergeleri */}
                            <div className="flex items-center gap-1.5 px-2">
                                {slides.map((s, idx) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                                            idx === currentIndex
                                                ? 'w-7 bg-pink-500 shadow-md shadow-pink-500/50'
                                                : 'bg-slate-700 hover:bg-slate-500'
                                        }`}
                                        title={`${idx + 1}. Slayt`}
                                    />
                                ))}
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentIndex(prev => Math.min(slides.length - 1, prev + 1))}
                                disabled={currentIndex === slides.length - 1}
                                className="h-8 px-3 rounded-xl border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold"
                            >
                                Sonraki <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    </div>

                    {/* SAĞ: Slayt Seçici ve Açıklama Metni Önizlemesi */}
                    <div className="flex-1 min-w-0 h-full flex flex-col gap-3 justify-between">
                        
                        {/* Slayt Listesi */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2">
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-pink-400" />
                                <span>Carousel Slaytları ({slides.length} Sayfa)</span>
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {slides.map((s, idx) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                                            idx === currentIndex
                                                ? 'bg-pink-600/20 border-pink-500 text-white shadow-md'
                                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between text-[11px] font-bold">
                                            <span>Slayt {idx + 1}</span>
                                            {idx === currentIndex && <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>}
                                        </div>
                                        <div className="text-xs font-black text-slate-200 truncate">
                                            {s.title}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Açıklama Metni (Caption) Kutusu */}
                        <div className="flex-1 min-h-0 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 overflow-hidden">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Hazır Gönderi Metni & Etiketler</span>
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
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
