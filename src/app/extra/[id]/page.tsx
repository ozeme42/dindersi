
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Download, Printer, Share2, Plus, Minus,
    Settings2, RotateCcw, Clock, Eye, FileText,
    ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

// Script Runner: HTML içindeki scriptleri güvenli bir şekilde çalıştıran yardımcı fonksiyon
const executeInlineScripts = (container: HTMLElement) => {
    const scripts = container.querySelectorAll('script');
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        
        // Fonksiyonları global window objesine bağlayan bir proxy mekanizması ekleyebiliriz
        // veya script içeriğini direkt eval ile çalıştırabiliriz (dikkatli olunmalı)
        try {
            // Script içeriğini global kapsama almak için başına window. ekleyebiliriz
            // Ama dindersiatolyesi dökümanları genellikle global fonksiyonlar kullanır
            // Bu yüzden direkt script tag'ini DOM'a eklemek en doğrusudur.
            oldScript.parentNode?.replaceChild(newScript, oldScript);
        } catch (e) {
            console.error("Script execution failed:", e);
        }
    });
};

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const pageId = params.id as string;
    
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(pageId);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa yüklenirken bir hata oluştu.");
            }
            setIsLoading(false);
        };
        fetchPage();

        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, [pageId]);

    // İçerik yüklendiğinde scriptleri çalıştır
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // Scriptleri bir kez çalıştır
            setTimeout(() => {
                if (contentRef.current) executeInlineScripts(contentRef.current);
            }, 100);
        }
    }, [page?.htmlContent]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2.5));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
    const handleResetZoom = () => setZoomLevel(1);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Döküman Hazırlanıyor</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-[2.5rem] p-10 shadow-2xl">
                    <div className="p-4 bg-red-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <X className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase mb-4">Hata Oluştu</h2>
                    <p className="text-slate-400 mb-8">{error || "Aradığınız dökümana şu an ulaşılamıyor."}</p>
                    <Button asChild className="w-full h-12 bg-slate-800 hover:bg-slate-700 rounded-xl">
                        <Link href="/extra">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={cn(
                "min-h-screen bg-white flex flex-col overflow-hidden relative",
                isFullscreen ? "h-screen" : "bg-slate-50"
            )}
        >
            {/* Header / Toolbar */}
            <header className={cn(
                "flex-shrink-0 z-50 flex items-center justify-between transition-all duration-300 px-4",
                isFullscreen 
                    ? "h-14 bg-slate-900 text-white shadow-xl opacity-0 hover:opacity-100 focus-within:opacity-100" 
                    : "h-20 bg-white border-b border-slate-200 shadow-sm"
            )}>
                <div className="flex items-center gap-4 overflow-hidden">
                     {!isFullscreen && (
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link>
                        </Button>
                     )}
                     <div className="min-w-0">
                         <h1 className={cn(
                             "font-black tracking-tight truncate leading-none",
                             isFullscreen ? "text-lg text-white" : "text-xl text-slate-900 uppercase"
                         )}>
                            {page.title}
                         </h1>
                         {!isFullscreen && (
                            <div className="flex items-center gap-3 mt-1.5">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase">{page.category || 'Genel'}</Badge>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                                </span>
                            </div>
                         )}
                     </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Zoom Kontrolleri */}
                    <div className={cn(
                        "flex items-center rounded-xl p-1 gap-1",
                        isFullscreen ? "bg-white/10" : "bg-slate-100"
                    )}>
                        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 rounded-lg hover:bg-white/20">
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <button 
                            onClick={handleResetZoom}
                            className="text-[10px] font-black w-10 text-center hover:text-indigo-600 transition-colors"
                        >
                            {Math.round(zoomLevel * 100)}%
                        </button>
                        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 rounded-lg hover:bg-white/20">
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={toggleFullscreen} 
                            className="h-10 w-10 rounded-xl hover:bg-slate-100"
                        >
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                        {!isFullscreen && (
                            <Button variant="ghost" size="icon" onClick={() => window.print()} className="h-10 w-10 rounded-xl hover:bg-slate-100">
                                <Printer className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* İçerik Alanı (Native Scroll & Zoom) */}
            <main className="flex-1 overflow-auto relative bg-slate-50/50 custom-scrollbar">
                <div 
                    className={cn(
                        "mx-auto transition-all duration-300 origin-top min-h-full bg-white shadow-2xl",
                        isFullscreen ? "w-full" : "max-w-5xl my-6 rounded-[2.5rem] border border-slate-200"
                    )}
                    style={{ 
                        transform: `scale(${zoomLevel})`,
                        width: isFullscreen ? `${100 / zoomLevel}%` : 'auto',
                        marginBottom: isFullscreen ? '0' : `${(zoomLevel - 1) * 100}%`
                    }}
                >
                    <div 
                        ref={contentRef}
                        className="p-6 md:p-10 lg:p-16 prose max-w-none text-slate-900"
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </div>

                {/* Floating Fullscreen Exit Button */}
                <div className={cn(
                    "fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500",
                    isFullscreen ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
                )}>
                    <Button 
                        onClick={() => document.exitFullscreen()}
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30 shadow-2xl shadow-red-900/40"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> TAM EKRANDAN ÇIK
                    </Button>
                </div>
            </main>
            
            <style jsx global>{`
                /* Döküman içi özel stiller */
                .prose h1, .prose h2, .prose h3 { font-family: 'Poppins', sans-serif; font-weight: 900; text-transform: uppercase; color: #1e293b; }
                .prose .adim-box { border: 2px solid #e2e8f0; border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 1.5rem; background: #f8fafc; transition: all 0.3s; }
                .prose .adim-box:hover { border-color: #6366f1; background: white; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                @media print {
                    .no-print { display: none !important; }
                    header, footer, button { display: none !important; }
                    .prose { padding: 0 !important; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
}
