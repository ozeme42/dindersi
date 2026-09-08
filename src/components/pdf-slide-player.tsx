'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Maximize2,
    Minimize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    ExternalLink,
    FileText,
    Grid,
    Loader2,
    AlertTriangle,
    Layers,
    X,
    Maximize,
    GripHorizontal,
    EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PdfSlideStep } from '@/lib/types';

export function formatPdfEmbedUrl(rawUrl: string): string {
    let url = (rawUrl || '').trim();
    if (!url) return '';

    // 1. Google Drive: /file/d/{ID} veya id={ID} -> /preview
    if (url.includes('drive.google.com')) {
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                            url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                            url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
        }
        return url;
    }

    // 2. Google Slides / Docs Presentation
    if (url.includes('docs.google.com/presentation')) {
        const slideIdMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
        if (slideIdMatch && slideIdMatch[1]) {
            return `https://docs.google.com/presentation/d/${slideIdMatch[1]}/embed?start=false&loop=false&delayms=3000`;
        }
        return url;
    }

    // 3. Canva: view -> embed
    if (url.includes('canva.com')) {
        if (!url.includes('embed')) {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}embed`;
        }
        return url;
    }

    return url;
}

export interface PdfSlidePlayerProps {
    step: PdfSlideStep;
    isFullscreen?: boolean;
    isTeacher?: boolean;
    hasBottomDock?: boolean;
    className?: string;
    onNextStep?: () => void;
    onPrevStep?: () => void;
}

let pdfjsLibInstance: any = null;

async function getPdfjs() {
    if (pdfjsLibInstance) return pdfjsLibInstance;
    const pdfjs = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    pdfjsLibInstance = pdfjs;
    return pdfjs;
}

export function PdfSlidePlayer({ 
    step, 
    isFullscreen, 
    isTeacher, 
    hasBottomDock = false, 
    className,
    onNextStep,
    onPrevStep
}: PdfSlidePlayerProps) {
    const rawUrl = (step.pdfUrl || '').trim();

    // Servis tespiti
    const isCanva = rawUrl.includes('canva.com');
    const isGoogleSlides = rawUrl.includes('docs.google.com/presentation');
    const isGoogleDrive = rawUrl.includes('drive.google.com');
    const isDirectPdf = rawUrl.startsWith('/uploads/') || rawUrl.toLowerCase().endsWith('.pdf');

    // Görünüm Modu: Canva ve Google Slides doğrudan embed ile çalışır; PDF dosyaları varsayılan olarak "slide" modunda açılır.
    const initialMode = (isCanva || isGoogleSlides) ? 'embed' : 'slide';
    const [viewMode, setViewMode] = useState<'slide' | 'embed'>(initialMode);

    // Ekranı Kapla / Sığdır Modu ('fill' = Sağ, sol, üst, alt tam dolar sıfır siyah boşluk; 'fit' = Orijinal orana sığdır)
    const [fitMode, setFitMode] = useState<'fill' | 'fit'>('fill');

    // Tam Ekran Tespiti (Browser fullscreen veya prop)
    const [isFs, setIsFs] = useState(false);
    useEffect(() => {
        const handleFsChange = () => {
            setIsFs(!!document.fullscreenElement);
        };
        handleFsChange();
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);
    const isTrulyFullscreen = Boolean(isFullscreen || isFs);

    // Slayt Durumu
    const [isSlideBarCollapsed, setIsSlideBarCollapsed] = useState<boolean>(false);
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
    const [reloadKey, setReloadKey] = useState<number>(0);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerWrapperRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    const isRenderingRef = useRef<boolean>(false);
    const nextRenderRef = useRef<{ pageNum: number; doc: any } | null>(null);

    // Embed URL (Google Drive / Canva / Google Slides için)
    const embedUrl = useMemo(() => formatPdfEmbedUrl(rawUrl), [rawUrl]);

    // Component unmount cleanup
    useEffect(() => {
        return () => {
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {}
            }
        };
    }, []);

    // PDF.js ile PDF Yükleme
    useEffect(() => {
        if (!rawUrl || viewMode === 'embed') {
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        setIsLoading(true);
        setLoadError(null);

        async function loadDocument() {
            try {
                const pdfjs = await getPdfjs();

                let sourceUrl = rawUrl;
                // Google Drive linki ise proxy üzerinden yükle
                if (isGoogleDrive) {
                    sourceUrl = `/api/proxy-pdf?url=${encodeURIComponent(rawUrl)}`;
                }

                const loadingTask = pdfjs.getDocument({
                    url: sourceUrl,
                    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
                    cMapPacked: true,
                });

                const doc = await loadingTask.promise;
                if (!isCancelled) {
                    setPdfDoc(doc);
                    setNumPages(doc.numPages);
                    setCurrentPage(1);
                    setIsLoading(false);
                }
            } catch (err: any) {
                if (!isCancelled) {
                    console.warn('[PdfSlidePlayer] PDF.js load failed:', err);
                    setLoadError(err.message || 'PDF yüklenemedi.');
                    setIsLoading(false);
                    // Eğer Google Drive linki proxy'de takıldıysa otomatik olarak embed moduna geçir
                    if (isGoogleDrive) {
                        setViewMode('embed');
                    }
                }
            }
        }

        loadDocument();

        return () => {
            isCancelled = true;
        };
    }, [rawUrl, reloadKey, viewMode, isGoogleDrive]);

    // Sayfa Çizimi (Canvas Rendering ile Mutex / Sıralı Kuyruk Koruması & Tam Ekran Kenardan Kenara Yayılma)
    const renderPage = useCallback(async (pageNum: number, doc: any) => {
        if (!doc || !canvasRef.current || !containerRef.current) return;

        // Eğer zaten aktif bir çizim varsa, yeni isteği sıraya al ve mevcut işlemi iptal et
        if (isRenderingRef.current) {
            nextRenderRef.current = { pageNum, doc };
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel();
                } catch {}
            }
            return;
        }

        isRenderingRef.current = true;

        try {
            const page = await doc.getPage(pageNum);
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (!canvas || !container) {
                isRenderingRef.current = false;
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                isRenderingRef.current = false;
                return;
            }

            // Kapsayıcı boyutlarını sıfır kenar boşluğu ile tam al
            const rect = container.getBoundingClientRect();
            const availableWidth = rect.width || container.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
            const availableHeight = rect.height || container.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);

            const unscaledViewport = page.getViewport({ scale: 1 });
            const scaleX = availableWidth / unscaledViewport.width;
            const scaleY = availableHeight / unscaledViewport.height;

            // 'fill': Sağ, sol, üst, alt tüm ekranı kaplasın (Math.max) - Sıfır siyah kenar
            // 'fit': Slayt içeriğini bozmadan sınıra kadar sığdırsın (Math.min)
            const baseScale = fitMode === 'fill' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
            const finalScale = baseScale * scale;

            // Yüksek çözünürlüklü ekranlar (Retina / 4K / Akıllı Tahta)
            const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
            const viewport = page.getViewport({ scale: finalScale * dpr });

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);

            // CSS piksel boyutları
            canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
            canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

            // Transform sıfırlanır (çift ölçeklemeyi önler)
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
            };

            const renderTask = page.render(renderContext);
            renderTaskRef.current = renderTask;
            await renderTask.promise;
        } catch (err: any) {
            if (err?.name !== 'RenderingCancelledException') {
                console.error('[PdfSlidePlayer] Render error:', err);
            }
        } finally {
            isRenderingRef.current = false;
            renderTaskRef.current = null;

            // Eğer render sürerken yeni bir sayfa veya boyut isteği geldiyse hemen çiz
            if (nextRenderRef.current) {
                const next = nextRenderRef.current;
                nextRenderRef.current = null;
                renderPage(next.pageNum, next.doc);
            }
        }
    }, [scale, fitMode]);

    // Sayfa, ölçek veya mod değiştikçe çiz
    useEffect(() => {
        if (pdfDoc && viewMode === 'slide') {
            renderPage(currentPage, pdfDoc);
        }
    }, [pdfDoc, currentPage, renderPage, viewMode, fitMode, scale]);

    // Ekran boyutu değiştiğinde yeniden çiz (Debounced ResizeObserver)
    useEffect(() => {
        if (!containerRef.current || !pdfDoc || viewMode !== 'slide') return;

        let resizeTimer: any;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                renderPage(currentPage, pdfDoc);
            }, 80);
        });

        resizeObserver.observe(containerRef.current);
        return () => {
            clearTimeout(resizeTimer);
            resizeObserver.disconnect();
        };
    }, [pdfDoc, currentPage, renderPage, viewMode]);

    // Slayt İlerleme Fonksiyonları
    const goToPrevPage = useCallback(() => {
        if (currentPage > 1) {
            setCurrentPage(p => Math.max(1, p - 1));
        } else if (onPrevStep) {
            onPrevStep();
        }
    }, [currentPage, onPrevStep]);

    const goToNextPage = useCallback(() => {
        if (currentPage < numPages) {
            setCurrentPage(p => Math.min(numPages, p + 1));
        } else if (onNextStep) {
            onNextStep();
        }
    }, [currentPage, numPages, onNextStep]);

    const goToFirstPage = useCallback(() => setCurrentPage(1), []);
    const goToLastPage = useCallback(() => setCurrentPage(numPages), [numPages]);

    // Klavye Kısayolları (Sağ/Sol Ok, Boşluk Tuşu, Home, End)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
            if (viewMode !== 'slide') return;

            if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
                e.preventDefault();
                goToNextPage();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                e.preventDefault();
                goToPrevPage();
            } else if (e.key === 'Home') {
                e.preventDefault();
                goToFirstPage();
            } else if (e.key === 'End') {
                e.preventDefault();
                goToLastPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNextPage, goToPrevPage, goToFirstPage, goToLastPage, viewMode]);

    // Akıllı Tahta Dokunmatik Kaydırma (Touch Swipe)
    const touchStartX = useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;
        if (diff > 50) {
            goToNextPage(); // Sola kaydırıldı -> Sonraki slayt
        } else if (diff < -50) {
            goToPrevPage(); // Sağa kaydırıldı -> Önceki slayt
        }
        touchStartX.current = null;
    };

    // Tam Ekran Geçişi
    const toggleFullscreen = () => {
        if (!playerWrapperRef.current) return;
        if (!document.fullscreenElement) {
            playerWrapperRef.current.requestFullscreen().catch(err => {
                console.warn('Fullscreen request failed:', err);
            });
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    return (
        <div 
            ref={playerWrapperRef}
            className={cn(
                "w-full h-full relative overflow-hidden bg-black text-white select-none flex items-center justify-center",
                className
            )}
        >
            {/* ══ 1. SLAYT ÇİZİM ALANI (TAM EKRAN KENARDAN KENARA KAPLAYAN CANVAS) ══ */}
            {viewMode === 'slide' && (
                <div 
                    ref={containerRef}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="w-full h-full absolute inset-0 flex items-center justify-center overflow-hidden bg-black p-0 m-0 select-none"
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-slate-300 z-10">
                            <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
                            <p className="text-sm font-bold tracking-wide">Slaytlar hazırlanıyor...</p>
                        </div>
                    ) : loadError ? (
                        <div className="max-w-md p-6 bg-slate-900/90 border border-rose-500/30 rounded-3xl text-center flex flex-col items-center gap-3 z-10 backdrop-blur-xl">
                            <AlertTriangle className="w-10 h-10 text-rose-400" />
                            <h3 className="font-black text-sm text-white">Slayt Modunda Açılamadı</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {isGoogleDrive 
                                    ? "Bu Google Drive dosyası gizli olabilir veya doğrudan görüntüleme engellendi." 
                                    : loadError}
                            </p>
                            <div className="flex gap-2 mt-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setViewMode('embed')}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                                >
                                    Gömülü Modda Aç
                                </Button>
                                <a
                                    href={rawUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-200"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Bağlantıyı Aç
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Canvas Slayt (Kenarlık ve yuvarlak köşe olmadan tam ekran) */}
                            <canvas 
                                ref={canvasRef} 
                                className="block m-0 p-0 bg-black flex-shrink-0 select-none shadow-none rounded-none transition-opacity duration-150"
                            />

                            {/* Akıllı Tahta Yan Dokunmatik Geçiş Okları (Sadece tam ekran DEĞİLKEN görünür) */}
                            {numPages > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={goToPrevPage}
                                        disabled={currentPage <= 1}
                                        className={cn(
                                            "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-12 h-20 md:w-16 md:h-28 rounded-2xl bg-black/40 hover:bg-black/80 text-white/70 hover:text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20 shadow-2xl",
                                            currentPage <= 1 ? "opacity-0 pointer-events-none" : "hover:scale-105 active:scale-95"
                                        )}
                                        title="Önceki Slayt (Sol Ok)"
                                    >
                                        <ChevronLeft className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={goToNextPage}
                                        disabled={currentPage >= numPages}
                                        className={cn(
                                            "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-12 h-20 md:w-16 md:h-28 rounded-2xl bg-black/40 hover:bg-black/80 text-white/70 hover:text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20 shadow-2xl",
                                            currentPage >= numPages ? "opacity-0 pointer-events-none" : "hover:scale-105 active:scale-95"
                                        )}
                                        title="Sonraki Slayt (Sağ Ok veya Boşluk)"
                                    >
                                        <ChevronRight className="w-8 h-8 md:w-10 md:h-10 text-white drop-shadow-md" />
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ══ 2. GÖMÜLÜ MOD (IFRAME İLE CANVA / DRIVE / SLIDES) ══ */}
            {viewMode === 'embed' && (
                <div className="w-full h-full absolute inset-0 bg-black">
                    {embedUrl ? (
                        <iframe
                            key={reloadKey}
                            src={embedUrl}
                            title={step.title || 'Sunum'}
                            className="w-full h-full border-0 bg-black block"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                            <FileText className="w-12 h-12 text-slate-600" />
                            <p className="text-sm font-bold">Geçerli bir PDF veya sunum bağlantısı bulunamadı.</p>
                        </div>
                    )}
                </div>
            )}

            {/* ══ 3. YÜZEN ÜST BAŞLIK VE AYARLAR BARI (Sadece Tam Ekran DEĞİLKEN görünür) ══ */}
            {!isTrulyFullscreen && (
                <div className="absolute top-3 left-3 right-3 sm:left-6 sm:right-6 z-30 flex items-center justify-between pointer-events-none animate-in fade-in duration-200">
                    {/* Sol Bilgi Kapsülü */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl pointer-events-auto max-w-[60%] sm:max-w-md">
                        <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex-shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                        </span>
                        <span className="font-black text-xs text-white truncate">
                            {step.title || 'PDF Sunumu'}
                        </span>
                        <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 text-slate-400 flex-shrink-0">
                            {isGoogleDrive ? '📁 Drive' : isCanva ? '🎨 Canva' : isDirectPdf ? '📄 PDF' : '🔗 Sunu'}
                        </span>
                    </div>

                    {/* Sağ Kontrol Araçları */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/15 shadow-2xl pointer-events-auto">
                        {/* Görünüm Modu Değiştirici */}
                        {(isGoogleDrive || isDirectPdf) && (
                            <div className="hidden sm:flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5 text-xs font-bold mr-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('slide')}
                                    className={cn(
                                        "px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[11px]",
                                        viewMode === 'slide' 
                                            ? "bg-rose-600 text-white shadow-sm" 
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    <Layers className="w-3 h-3" />
                                    <span>Slayt</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('embed')}
                                    className={cn(
                                        "px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[11px]",
                                        viewMode === 'embed' 
                                            ? "bg-rose-600 text-white shadow-sm" 
                                            : "text-slate-400 hover:text-white"
                                    )}
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Gömülü</span>
                                </button>
                            </div>
                        )}

                        {/* Ekranı Kapla / Sığdır Geçiş Butonu */}
                        {viewMode === 'slide' && (
                            <button
                                type="button"
                                onClick={() => setFitMode(m => m === 'fill' ? 'fit' : 'fill')}
                                className={cn(
                                    "px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                                    fitMode === 'fill' 
                                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30" 
                                        : "bg-white/10 border-white/15 text-slate-200 hover:bg-white/20"
                                )}
                                title={fitMode === 'fill' ? "Orijinal Orana Sığdır" : "Ekranı Tam Doldur (Sıfır Kenar Boşluğu)"}
                            >
                                <Maximize className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">{fitMode === 'fill' ? 'Ekranı Kapla' : 'Sığdır'}</span>
                            </button>
                        )}

                        {/* Yeniden Yükle */}
                        <button
                            type="button"
                            onClick={() => setReloadKey(k => k + 1)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                            title="Yeniden Yükle"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        {/* Tam Ekran */}
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                            title="Tam Ekran"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Yeni Sekmede Aç */}
                        {rawUrl && (
                            <a
                                href={rawUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer"
                                title="Yeni Sekmede Aç"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Sekmede Aç</span>
                            </a>
                        )}
                    </div>
                </div>
            )}

            {/* ══ 4. YÜZEN & TAŞINABİLİR SLAYT GEÇİŞ DOCK'U (ASIL SLAYT ÇUBUĞU - İSTENDİĞİ YERE TAŞINABİLİR / TEK SİMGE MODU) ══ */}
            {viewMode === 'slide' && numPages > 0 && (
                <motion.div
                    drag
                    dragMomentum={false}
                    dragConstraints={playerWrapperRef}
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 z-30 pointer-events-auto",
                        hasBottomDock ? "bottom-16 sm:bottom-18" : "bottom-15 sm:bottom-16"
                    )}
                >
                    {isSlideBarCollapsed ? (
                        <button
                            type="button"
                            onClick={() => setIsSlideBarCollapsed(false)}
                            className="flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.7)] text-rose-400 hover:text-white transition-all backdrop-blur-xl cursor-pointer hover:scale-110 active:scale-95 group select-none"
                            title="Slayt Çubuğunu Göster"
                        >
                            <Layers className="w-5 h-5 transition-transform group-hover:scale-110" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.7)] select-none">
                            {/* Taşıma Tutamacı */}
                            <div 
                                className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-white transition-colors flex items-center justify-center touch-none"
                                title="Slayt çubuğunu ekranda istediğin yere sürükle"
                            >
                                <GripHorizontal className="w-4 h-4" />
                            </div>
                            {/* İlk Slayt */}
                            <button
                                type="button"
                                onClick={goToFirstPage}
                                disabled={currentPage <= 1}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-20 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                                title="İlk Slayt (Home)"
                            >
                                <ChevronsLeft className="w-4 h-4" />
                            </button>

                            {/* Önceki Slayt */}
                            <button
                                type="button"
                                onClick={goToPrevPage}
                                disabled={currentPage <= 1}
                                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-20 text-slate-200 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Önceki Slayt (Sol Ok)"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="hidden sm:inline">Önceki</span>
                            </button>

                            {/* Slayt Seçici Rozet (Grid Listeyi Açar) */}
                            <button
                                type="button"
                                onClick={() => setShowThumbnails(true)}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs md:text-sm shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
                                title="Tüm Slaytları Görüntüle"
                            >
                                <Grid className="w-3.5 h-3.5" />
                                <span>{currentPage} / {numPages}</span>
                            </button>

                            {/* Sonraki Slayt */}
                            <button
                                type="button"
                                onClick={goToNextPage}
                                disabled={currentPage >= numPages}
                                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-20 text-slate-200 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Sonraki Slayt (Sağ Ok veya Boşluk)"
                            >
                                <span className="hidden sm:inline">Sonraki</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Son Slayt */}
                            <button
                                type="button"
                                onClick={goToLastPage}
                                disabled={currentPage >= numPages}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 disabled:opacity-20 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                                title="Son Slayt (End)"
                            >
                                <ChevronsRight className="w-4 h-4" />
                            </button>

                            <div className="w-px h-5 bg-white/15 hidden md:block" />

                            {/* Yakınlaştırma & Sığdırma Kontrolleri */}
                            <div className="hidden md:flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setScale(s => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
                                    className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                    title="Uzaklaştır"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScale(1)}
                                    className="px-2 py-0.5 text-[11px] font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                                    title="Yakınlaştırmayı Sıfırla (%100)"
                                >
                                    %{Math.round(scale * 100)}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
                                    className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                    title="Yakınlaştır"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Ekranı Kapla / Sığdır Geçiş Butonu */}
                            <button
                                type="button"
                                onClick={() => setFitMode(m => m === 'fill' ? 'fit' : 'fill')}
                                className={cn(
                                    "px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                                    fitMode === 'fill' 
                                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30" 
                                        : "bg-white/10 border-white/15 text-slate-200 hover:bg-white/20"
                                )}
                                title={fitMode === 'fill' ? "Orijinal Orana Sığdır" : "Ekranı Tam Doldur (Sıfır Kenar Boşluğu)"}
                            >
                                <Maximize className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">{fitMode === 'fill' ? 'Kapla' : 'Sığdır'}</span>
                            </button>

                            {/* Tam Ekran / Küçült Butonu */}
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                                title={isTrulyFullscreen ? "Tam Ekrandan Çık (Esc)" : "Tam Ekran Yap"}
                            >
                                {isTrulyFullscreen ? (
                                    <Minimize2 className="w-4 h-4 text-rose-400" />
                                ) : (
                                    <Maximize2 className="w-4 h-4" />
                                )}
                            </button>

                            <div className="w-px h-5 bg-white/15" />

                            {/* Slayt Çubuğunu Gizle (Tek Simgeye Küçült) */}
                            <button
                                type="button"
                                onClick={() => setIsSlideBarCollapsed(true)}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                                title="Slayt Çubuğunu Gizle (Tek Simgeye Küçült)"
                            >
                                <EyeOff className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ══ 5. TÜM SLAYTLAR GRID SEÇİCİ MODAL ══ */}
            {showThumbnails && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl z-40 p-6 flex flex-col animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                        <div className="flex items-center gap-2">
                            <Grid className="w-5 h-5 text-rose-400" />
                            <h3 className="font-black text-sm text-white">Tüm Slaytlar ({numPages} Sayfa)</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowThumbnails(false)}
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pr-1">
                        {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                            <button
                                key={pageNum}
                                type="button"
                                onClick={() => {
                                    setCurrentPage(pageNum);
                                    setShowThumbnails(false);
                                }}
                                className={cn(
                                    "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 font-black transition-all cursor-pointer",
                                    currentPage === pageNum 
                                        ? "border-rose-500 bg-rose-500/20 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.3)] scale-105" 
                                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                <FileText className="w-6 h-6 text-slate-400" />
                                <span className="text-xs">Slayt {pageNum}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
