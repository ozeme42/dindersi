'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    ZoomIn, ZoomOut, RotateCcw, Share2, 
    Printer, Download, Home, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const contentRef = useRef<HTMLDivElement>(null);

    // Veri Çekme
    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa yüklenemedi.");
            }
            setIsLoading(false);
        };
        if (id) fetchPage();
    }, [id]);

    // Script Runner: İçerikteki interaktif bölümleri React ortamında güvenli çalıştırma
    useEffect(() => {
        if (!page?.htmlContent || isLoading) return;

        const executeScripts = () => {
            // 1. showSection, initAdimAdim gibi global fonksiyonları window'a güvenle bağla
            const scripts = contentRef.current?.querySelectorAll('script');
            if (!scripts) return;

            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });
                
                // İçerikteki fonksiyon tanımlarını window nesnesine aktar
                const scriptText = oldScript.innerHTML;
                if (scriptText) {
                    newScript.innerHTML = `
                        (function() {
                            try {
                                ${scriptText}
                                // Tanımlanan fonksiyonları global kapsama çıkar
                                if (typeof showSection !== 'undefined') window.showSection = showSection;
                                if (typeof initAdimAdim !== 'undefined') window.initAdimAdim = initAdimAdim;
                                if (typeof toggleAccordion !== 'undefined') window.toggleAccordion = toggleAccordion;
                                if (typeof initCategoryMenu !== 'undefined') window.initCategoryMenu = initCategoryMenu;
                                if (typeof go !== 'undefined') window.go = go;
                            } catch(e) { console.error("Script Execution Error:", e); }
                        })();
                    `;
                }
                
                document.body.appendChild(newScript);
                setTimeout(() => document.body.removeChild(newScript), 100);
            });
            
            // 2. Eğer içerikte otomatik başlatılması gereken fonksiyonlar varsa (init gibi)
            try {
                if (typeof (window as any).initAdimAdim === 'function') (window as any).initAdimAdim();
                if (typeof (window as any).initCategoryMenu === 'function') (window as any).initCategoryMenu();
            } catch(e) {}
        };

        // DOM'un render olması için kısa bir gecikme
        const timeout = setTimeout(executeScripts, 500);
        return () => clearTimeout(timeout);
    }, [page, isLoading]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">İçerik Hazırlanıyor...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-6">
                <Card className="max-w-md w-full p-8 text-center border-none shadow-2xl rounded-[2rem]">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">HATA OLUŞTU</h2>
                    <p className="text-slate-500 mb-8">{error || "İçerik bulunamadı veya silinmiş."}</p>
                    <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 h-12 rounded-xl">
                        <Link href="/extra">Galeriye Dön</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen bg-slate-100 transition-all duration-500",
            isFullscreen ? "p-0 bg-white" : "p-4 md:p-8"
        )}>
            {/* Navigasyon Barı */}
            {!isFullscreen && (
                <div className="container mx-auto max-w-7xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                         <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-white shadow-sm bg-white border border-slate-200">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                         </Button>
                         <div className="min-w-0">
                             <h1 className="text-2xl font-black text-slate-900 truncate uppercase tracking-tight">
                                {page.title}
                             </h1>
                             <Badge variant="outline" className="bg-white text-indigo-600 border-indigo-100 text-[10px] font-black uppercase mt-1">
                                {page.category || 'Genel'}
                             </Badge>
                         </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
                        <div className="flex items-center gap-1 border-r border-slate-100 pr-2 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="h-9 w-9 rounded-lg"><ZoomOut className="h-4 w-4" /></Button>
                            <span className="text-[10px] font-black text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(2.5, zoom + 0.1))} className="h-9 w-9 rounded-lg"><ZoomIn className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setZoom(1)} className="h-9 w-9 rounded-lg text-slate-300"><RotateCcw className="h-3.5 w-3.5" /></Button>
                        </div>
                        <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-indigo-600 hover:bg-indigo-50">
                            <Maximize2 className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* İçerik Alanı */}
            <div className={cn(
                "relative transition-all duration-500",
                isFullscreen ? "h-screen w-screen" : "container mx-auto max-w-7xl"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white relative overflow-hidden",
                    isFullscreen ? "rounded-none h-full" : "rounded-[2.5rem] shadow-2xl min-h-[85vh] p-6 md:p-12 border border-slate-200"
                )}>
                    {/* Native HTML Render Area */}
                    <div 
                        ref={contentRef}
                        className="prose prose-slate max-w-none w-full h-full"
                        style={{ 
                            zoom: zoom,
                            transformOrigin: 'top center',
                        }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </Card>

                {/* Fullscreen Floating Exit Button */}
                {isFullscreen && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <Button 
                            onClick={toggleFullscreen} 
                            className="h-14 px-8 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-2xl border border-white/20 gap-3"
                        >
                            <Minimize2 className="h-5 w-5" /> TAM EKRANDAN ÇIK
                        </Button>
                    </div>
                )}
            </div>

            {/* Yazdırma ve Paylaşım (Sadece Normal Modda) */}
            {!isFullscreen && (
                <div className="container mx-auto max-w-7xl mt-8 flex justify-center gap-4">
                    <Button variant="outline" onClick={() => window.print()} className="rounded-xl gap-2 bg-white border-slate-200 h-11 px-6 font-bold text-slate-600">
                        <Printer className="h-4 w-4" /> Yazdır
                    </Button>
                    <Button variant="outline" className="rounded-xl gap-2 bg-white border-slate-200 h-11 px-6 font-bold text-slate-600">
                        <Share2 className="h-4 w-4" /> Paylaş
                    </Button>
                </div>
            )}
        </div>
    );
}
