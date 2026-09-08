'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    Download,
    Info,
    Layers,
    Sparkles,
    RefreshCw,
    X,
    Maximize
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
    className?: string;
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

export function PdfSlidePlayer({ step, isFullscreen, isTeacher, className }: PdfSlidePlayerProps) {
    const rawUrl = (step.pdfUrl || '').trim();

    // Servis tespiti
    const isCanva = rawUrl.includes('canva.com');
    const isGoogleSlides = rawUrl.includes('docs.google.com/presentation');
    const isGoogleDrive = rawUrl.includes('drive.google.com');
    const isDirectPdf = rawUrl.startsWith('/uploads/') || rawUrl.toLowerCase().endsWith('.pdf');

    // Görünüm Modu: Canva ve Google Slides doğrudan embed ile çalışır; PDF dosyaları varsayılan olarak "slide" modunda açılır.
    const initialMode = (isCanva || isGoogleSlides) ? 'embed' : 'slide';
    const [viewMode, setViewMode] = useState<'slide' | 'embed'>(initialMode);

    // Slayt Durumu
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

    // Sayfa Çizimi (Canvas Rendering ile Mutex / Sıralı Kuyruk Koruması & Kusursuz Ölçekleme)
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

            // Kapsayıcı boyutlarını subpixel hassasiyetiyle al
            const rect = container.getBoundingClientRect();
            // Yan oklar ve kenarlıklar için temiz nefes payı (padding)
            const availableWidth = Math.max(280, (rect.width || container.clientWidth) - 48);
            const availableHeight = Math.max(200, (rect.height || container.clientHeight) - 24);

            const unscaledViewport = page.getViewport({ scale: 1 });
            const scaleX = availableWidth / unscaledViewport.width;
            const scaleY = availableHeight / unscaledViewport.height;

            // Math.min ile sayfanın HEM ENİ HEM BOYU ekrana %100 sığdırılır, asla taşmaz/kesilmez
            const fitScale = Math.min(scaleX, scaleY);
            const finalScale = fitScale * scale;

            // Yüksek çözünürlüklü ekranlar (Retina / 4K / Akıllı Tahta)
            const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
            const viewport = page.getViewport({ scale: finalScale * dpr });

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);

            // CSS piksel boyutları (dpr'a bölünerek doğru fiziksel boyuta oturtulur)
            canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
            canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

            // KRİTİK: Transform sıfırlanır! PDF.js viewport ölçeğini zaten kendi içinde uyguladığı için
            // ek olarak setTransform(dpr...) çağrılırsa çift ölçekleme yapıp slaytı kırpar!
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
    }, [scale]);

    // Sayfa değiştikçe çiz
    useEffect(() => {
        if (pdfDoc && viewMode === 'slide') {
            renderPage(currentPage, pdfDoc);
        }
    }, [pdfDoc, currentPage, renderPage, viewMode]);

    // Ekran boyutu değiştiğinde yeniden çiz (Debounced)
    useEffect(() => {
        if (!containerRef.current || !pdfDoc || viewMode !== 'slide') return;

        let resizeTimer: any;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                renderPage(currentPage, pdfDoc);
            }, 100);
        });

        resizeObserver.observe(containerRef.current);
        return () => {
            clearTimeout(resizeTimer);
            resizeObserver.disconnect();
        };
    }, [pdfDoc, currentPage, renderPage, viewMode]);

    // Slayt İlerleme Fonksiyonları
    const goToPrevPage = useCallback(() => {
        setCurrentPage(p => Math.max(1, p - 1));
    }, []);

    const goToNextPage = useCallback(() => {
        setCurrentPage(p => Math.min(numPages, p + 1));
    }, [numPages]);

    const goToFirstPage = useCallback(() => setCurrentPage(1), []);
    const goToLastPage = useCallback(() => setCurrentPage(numPages), [numPages]);

    // Klavye Kısayolları (Sağ/Sol Ok, Boşluk Tuşu)
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
        if (diff > 60) {
            goToNextPage(); // Sola kaydırıldı -> Sonraki slayt
        } else if (diff < -60) {
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
                "w-full h-full flex flex-col bg-slate-950 text-white rounded-2xl overflow-hidden border border-white/10 relative select-none",
                className
            )}
        >
            {/* Üst Başlık ve Kontrol Çubuğu */}
            <div className="flex items-center justify-between px-3 md:px-5 py-2.5 bg-slate-900/90 border-b border-white/10 backdrop-blur-md flex-shrink-0 z-30">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                    </span>
                    <span className="font-black text-xs sm:text-sm text-white truncate max-w-xs sm:max-w-md">
                        {step.title || 'PDF / Sunu Slaytı'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 text-slate-400 flex-shrink-0">
                        {isGoogleDrive ? '📁 Google Drive' : isCanva ? '🎨 Canva' : isDirectPdf ? '📄 PDF Slaytları' : '🔗 Bağlantı'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {/* Görünüm Modu Değiştirici (Slayt vs Embed) */}
                    {(isGoogleDrive || isDirectPdf) && (
                        <div className="hidden sm:flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setViewMode('slide')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                                    viewMode === 'slide' 
                                        ? "bg-rose-600 text-white shadow-sm" 
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Slayt Modu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('embed')}
                                className={cn(
                                    "px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer",
                                    viewMode === 'embed' 
                                        ? "bg-rose-600 text-white shadow-sm" 
                                        : "text-slate-400 hover:text-white"
                                )}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Gömülü Belge</span>
                            </button>
                        </div>
                    )}

                    {/* Yeniden Yükle */}
                    <button
                        type="button"
                        onClick={() => setReloadKey(k => k + 1)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                        title="Yeniden Yükle"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Tam Ekran */}
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                        title="Tam Ekran"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Yeni Sekmede Aç */}
                    {rawUrl && (
                        <a
                            href={rawUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer"
                            title="Yeni Sekmede Aç"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Sekmede Aç</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Google Drive Kısıtlı/Gizli Dosya Rehber Uyarısı */}
            {isGoogleDrive && (
                <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 z-20">
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span className="text-[11px] sm:text-xs">
                            <strong>Google Drive İpucu:</strong> Dosyanın akıllı tahtada açılması için Drive paylaşımının <em>"Bağlantıya sahip olan herkes"</em> olarak ayarlanması gerekir.
                        </span>
                    </div>
                    <a
                        href={rawUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] sm:text-xs font-bold underline hover:text-amber-100 flex-shrink-0 ml-2"
                    >
                        Paylaşımı Kontrol Et ↗
                    </a>
                </div>
            )}

            {/* ANA OYNATICI ALANI */}
            <div className="flex-1 min-h-0 w-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
                {/* 1. SLAYT MODU (CANVAS İLE SAYFA SAYFA SLAYT GEÇİŞİ) */}
                {viewMode === 'slide' && (
                    <div 
                        ref={containerRef}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        className="w-full h-full flex items-center justify-center p-2 sm:p-4 relative overflow-auto"
                    >
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                                <p className="text-xs font-bold">Slaytlar hazırlanıyor...</p>
                            </div>
                        ) : loadError ? (
                            <div className="max-w-md p-6 bg-slate-900 border border-rose-500/30 rounded-3xl text-center flex flex-col items-center gap-3">
                                <AlertTriangle className="w-10 h-10 text-rose-400" />
                                <h3 className="font-black text-sm text-white">Slayt Modunda Yüklenemedi</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    {isGoogleDrive 
                                        ? "Bu Google Drive dosyası kısıtlı olabilir veya tarayıcı güvenlik politikası nedeniyle doğrudan okunamadı." 
                                        : loadError}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setViewMode('embed')}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                                    >
                                        Gömülü Modda Dene
                                    </Button>
                                    <a
                                        href={rawUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Drive'da Aç
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Canvas Slayt Görseli (Hassas Piksel ve Gölge) */}
                                <canvas 
                                    ref={canvasRef} 
                                    className="rounded-xl shadow-2xl transition-all duration-200 bg-white block flex-shrink-0"
                                />

                                {/* Kenar Dokunmatik/Tıklamalı Slayt Butonları (Akıllı Tahta İçin Büyük) */}
                                {numPages > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={goToPrevPage}
                                            disabled={currentPage <= 1}
                                            className={cn(
                                                "absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-14 md:w-14 md:h-18 rounded-2xl bg-black/60 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20 shadow-2xl",
                                                currentPage <= 1 ? "opacity-20 cursor-not-allowed" : "hover:scale-105 active:scale-95"
                                            )}
                                            title="Önceki Slayt (Sol Ok)"
                                        >
                                            <ChevronLeft className="w-7 h-7 md:w-8 md:h-8 text-white drop-shadow-md" />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={goToNextPage}
                                            disabled={currentPage >= numPages}
                                            className={cn(
                                                "absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-14 md:w-14 md:h-18 rounded-2xl bg-black/60 hover:bg-black/85 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-20 shadow-2xl",
                                                currentPage >= numPages ? "opacity-20 cursor-not-allowed" : "hover:scale-105 active:scale-95"
                                            )}
                                            title="Sonraki Slayt (Sağ Ok veya Boşluk)"
                                        >
                                            <ChevronRight className="w-7 h-7 md:w-8 md:h-8 text-white drop-shadow-md" />
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* 2. GÖMÜLÜ MOD (IFRAME İLE CANVA / GOOGLE DRIVE / SLIDES) */}
                {viewMode === 'embed' && (
                    <div className="w-full h-full relative">
                        {embedUrl ? (
                            <iframe
                                key={reloadKey}
                                src={embedUrl}
                                title={step.title || 'Sunum'}
                                className="w-full h-full border-0 bg-slate-900"
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

                {/* Küçük Resimler / Slayt Seçici Modal */}
                {showThumbnails && (
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl z-40 p-6 flex flex-col animate-in fade-in duration-200">
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
                        <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pr-1">
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

            {/* ALT SLAYT KONTROL ÇUBUĞU (AKILLI TAHTA UYUMLU) */}
            {viewMode === 'slide' && numPages > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/95 border-t border-white/10 backdrop-blur-md flex-shrink-0 z-30">
                    {/* Hızlı Sayfa Seçici / Butonlar */}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={goToFirstPage}
                            disabled={currentPage <= 1}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                            title="İlk Slayt"
                        >
                            <ChevronsLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={goToPrevPage}
                            disabled={currentPage <= 1}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-200 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Önceki Slayt"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Önceki</span>
                        </button>
                    </div>

                    {/* Slayt Rozeti & Doğrudan Sayfa Seçici */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowThumbnails(true)}
                            className="px-4 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 hover:bg-rose-900/60 font-black text-xs md:text-sm shadow-sm flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                            title="Slayt Listesi"
                        >
                            <Grid className="w-3.5 h-3.5" />
                            <span>Slayt {currentPage} / {numPages}</span>
                        </button>
                    </div>

                    {/* İlerle & Yakınlaştır */}
                    <div className="flex items-center gap-1.5">
                        {/* Yakınlaştırma */}
                        <div className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
                            <button
                                type="button"
                                onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                                title="Uzaklaştır"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setScale(1)}
                                className="px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                                title="Sayfaya Sığdır (%100)"
                            >
                                %{Math.round(scale * 100)} Sığdır
                            </button>
                            <button
                                type="button"
                                onClick={() => setScale(s => Math.min(2.5, s + 0.2))}
                                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                                title="Yakınlaştır"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={goToNextPage}
                            disabled={currentPage >= numPages}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-30 text-white text-xs font-black flex items-center gap-1 cursor-pointer shadow-md"
                            title="Sonraki Slayt"
                        >
                            <span className="hidden sm:inline">Sonraki</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={goToLastPage}
                            disabled={currentPage >= numPages}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                            title="Son Slayt"
                        >
                            <ChevronsRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
