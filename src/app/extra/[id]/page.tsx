
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Plus, Minus, Globe, Share2, Printer, 
    ChevronLeft, ChevronRight, Home, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const pageId = params.id as string;
    
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            if (!pageId) return;
            setIsLoading(true);
            const res = await getExtraPage(pageId);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa yüklenemedi.");
            }
            setIsLoading(false);
        };
        fetchPage();
    }, [pageId]);

    // Script Runner: HTML içindeki interaktif fonksiyonların React ortamında çalışmasını sağlar
    useEffect(() => {
        if (page?.htmlContent && typeof window !== 'undefined') {
            const timer = setTimeout(() => {
                try {
                    // 1. Global uyumluluk fonksiyonları
                    (window as any).go = (val: number) => {
                        if (val === -1) router.back();
                    };

                    // 2. HTML içindeki scriptleri ayıkla ve çalıştır
                    const div = document.createElement('div');
                    div.innerHTML = page.htmlContent;
                    const scripts = div.querySelectorAll('script');
                    
                    scripts.forEach(script => {
                        const scriptContent = script.innerHTML;
                        if (scriptContent.trim()) {
                            try {
                                // Script içeriğini IIFE ile sarmalayarak çakışmaları önle
                                // Fonksiyonları window objesine bağla (toggleAccordion, showSection vb.)
                                const enhancedContent = `
                                    (function() {
                                        ${scriptContent}
                                        // Otomatik fonksiyon aktarımı
                                        const funcs = ['toggleAccordion', 'showSection', 'initAdimAdim', 'nextStep', 'prevStep'];
                                        funcs.forEach(f => {
                                            if (typeof eval('typeof ' + f) !== 'undefined') {
                                                window[f] = eval(f);
                                            }
                                        });
                                    })();
                                `;
                                const runner = new Function(enhancedContent);
                                runner();
                            } catch (e) {
                                console.warn("Script execution error:", e);
                            }
                        }
                    });

                    // 3. Başlatma fonksiyonu varsa çalıştır (Gecikmeli)
                    if (typeof (window as any).initAdimAdim === 'function') {
                        try {
                            (window as any).initAdimAdim();
                        } catch (e) {
                            console.warn("Init function error:", e);
                        }
                    }
                } catch (err) {
                    console.error("Global script runner failed:", err);
                }
            }, 300); // DOM yerleşimi için kısa bir bekleme

            return () => clearTimeout(timer);
        }
    }, [page?.htmlContent, router]);

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            contentRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">İçerik Hazırlanıyor</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="max-w-md w-full bg-white p-8 rounded-[2.5rem] shadow-xl text-center border border-red-100">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ArrowLeft className="h-10 w-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Hata Oluştu</h2>
                    <p className="text-slate-500 mb-8">{error || "Döküman bulunamadı."}</p>
                    <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl h-12">
                        <Link href="/extra">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={contentRef} className={cn(
            "min-h-screen transition-colors duration-500 flex flex-col",
            isFullscreen ? "bg-white p-0" : "bg-slate-50 p-4 md:p-8"
        )}>
            {/* Navigasyon Barı */}
            <div className={cn(
                "flex-shrink-0 flex items-center justify-between transition-all duration-300 mb-6",
                isFullscreen ? "fixed top-4 left-4 right-4 z-50 bg-white/80 backdrop-blur-md p-2 rounded-2xl border shadow-lg opacity-0 hover:opacity-100" : "container mx-auto"
            )}>
                <div className="flex items-center gap-4">
                     {!isFullscreen && (
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-white shadow-sm border border-slate-200">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link>
                        </Button>
                     )}
                     <div className="min-w-0">
                         <h1 className={cn("font-black tracking-tight text-slate-900 uppercase truncate", isFullscreen ? "text-lg" : "text-2xl md:text-3xl")}>
                            {page.title}
                         </h1>
                         {!isFullscreen && <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase mt-1">{page.category || 'Genel'}</Badge>}
                     </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-9 w-9 hover:bg-slate-50 text-slate-500"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-400 w-12 text-center uppercase tracking-tighter">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-9 w-9 hover:bg-slate-50 text-slate-500"><Plus className="h-4 w-4"/></Button>
                    </div>
                    
                    <Button variant="outline" onClick={() => window.print()} className="hidden md:flex rounded-xl gap-2 border-slate-200 h-11">
                        <Printer className="h-4 w-4" /> Yazdır
                    </Button>

                    <Button onClick={toggleFullscreen} variant="outline" size="icon" className="rounded-xl h-11 w-11 border-slate-200 shadow-sm bg-white text-slate-600">
                        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* İçerik Alanı */}
            <div className={cn(
                "flex-grow flex flex-col relative",
                isFullscreen ? "bg-white" : "container mx-auto"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    <CardContent className="p-0">
                        <div 
                            className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:leading-relaxed prose-img:rounded-3xl prose-img:shadow-2xl"
                            style={{ zoom: zoomLevel, transformOrigin: 'top center' }}
                            dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                        />
                    </CardContent>
                </Card>
            </div>
            
            {!isFullscreen && (
                <footer className="container mx-auto mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <span>© {new Date().getFullYear()} Din Dersi Atölyesi</span>
                    <div className="flex items-center gap-6">
                        <Link href="/extra" className="hover:text-indigo-600 transition-colors">Tüm Dökümanlar</Link>
                        <Link href="/" className="hover:text-indigo-600 transition-colors">Ana Sayfa</Link>
                    </div>
                </footer>
            )}
        </div>
    );
}
