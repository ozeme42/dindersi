
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Download, Printer, Plus, Minus, Share2, 
    FileText, Calendar, Tag, ChevronRight, Home, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Veri Çekme
    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                router.replace('/extra');
            }
            setIsLoading(false);
        };
        if (id) fetchPage();
    }, [id, router]);

    // JavaScript Script Runner Mekanizması
    // Döküman içerisindeki script'leri güvenli bir şekilde çalıştırır ve global fonksiyonları tanımlar.
    useEffect(() => {
        if (!page?.htmlContent) return;

        // Script etiketlerini bul ve ayıkla
        const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
        let match;
        const scripts: string[] = [];
        while ((match = scriptRegex.exec(page.htmlContent)) !== null) {
            scripts.push(match[1]);
        }

        if (scripts.length === 0) return;

        const scriptElements: HTMLScriptElement[] = [];

        scripts.forEach((scriptBody) => {
            const script = document.createElement('script');
            // Scriptleri bir IIFE (Kendi kendini çağıran fonksiyon) içine sararak çakışmaları engelliyoruz
            // ve önemli fonksiyonları window nesnesine bağlıyoruz.
            script.innerHTML = `
                (function() {
                    try {
                        // Yaygın fonksiyonları global kapsama çıkar
                        const exposeToWindow = (fnName, fn) => {
                            if (typeof fn === 'function') window[fnName] = fn;
                        };

                        ${scriptBody}

                        // Kritik fonksiyonları otomatik bul ve dışa aktar
                        if (typeof showSection !== 'undefined') window.showSection = showSection;
                        if (typeof initAdimAdim !== 'undefined') window.initAdimAdim = initAdimAdim;
                        if (typeof initCategoryMenu !== 'undefined') window.initCategoryMenu = initCategoryMenu;
                        if (typeof toggleAccordion !== 'undefined') window.toggleAccordion = toggleAccordion;
                        
                        // Tarayıcı geçmişi fonksiyonu go(-1) desteği
                        window.go = function(steps) { window.history.go(steps); };

                    } catch (e) {
                        console.warn("Script execution warning in ExtraPage:", e);
                    }
                })();
            `;
            document.body.appendChild(script);
            scriptElements.push(script);
        });

        // Temizlik: Component unmount olduğunda scriptleri kaldır
        return () => {
            scriptElements.forEach(s => {
                if (document.body.contains(s)) document.body.removeChild(s);
            });
        };
    }, [page]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-white" />
                <p className="text-slate-400 font-medium">Döküman Yükleniyor...</p>
            </div>
        );
    }

    if (!page) return null;

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen flex flex-col transition-colors duration-500",
            isFullscreen ? "bg-white" : "bg-slate-50"
        )}>
            {/* Header */}
            <header className={cn(
                "sticky top-0 z-50 flex items-center justify-between px-6 transition-all duration-300 print:hidden",
                isFullscreen 
                    ? "h-14 bg-white/80 backdrop-blur-md border-b opacity-0 hover:opacity-100" 
                    : "h-20 bg-white border-b border-slate-200"
            )}>
                <div className="flex items-center gap-4 min-w-0">
                     {!isFullscreen && (
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100 shrink-0">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                     )}
                     <div className="min-w-0">
                         <h1 className={cn(
                            "font-black tracking-tight text-slate-900 truncate uppercase leading-none",
                            isFullscreen ? "text-base" : "text-xl md:text-2xl"
                         )}>
                            {page.title}
                         </h1>
                         {!isFullscreen && <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase mt-1">{page.category || 'Genel'}</Badge>}
                     </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))} className="h-8 w-8 rounded-lg"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase">Zoom</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 rounded-lg"><Plus className="h-4 w-4"/></Button>
                    </div>
                    
                    <Button variant="outline" size="icon" onClick={() => window.print()} className="rounded-xl h-10 w-10 border-slate-200 hidden md:flex">
                        <Printer className="h-4 w-4" />
                    </Button>

                    <Button onClick={toggleFullscreen} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-4 gap-2 font-bold shadow-lg">
                        {isFullscreen ? <><Minimize2 className="h-4 w-4"/> Kapat</> : <><Maximize2 className="h-4 w-4"/> Tam Ekran</>}
                    </Button>
                </div>
            </header>

            {/* Content Viewport */}
            <main className={cn(
                "flex-1 overflow-auto custom-scrollbar relative p-4 md:p-8",
                isFullscreen ? "bg-white" : "container mx-auto"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    {/* Döküman Bilgi Kartı (Sadece normal modda) */}
                    {!isFullscreen && (
                        <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                                    <Tag className="h-4 w-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">{page.category || 'Genel'}</span>
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                                    {page.title}
                                </h2>
                                <p className="text-slate-500 text-lg max-w-3xl leading-relaxed">
                                    {page.description || "Bu döküman için açıklama belirtilmemiş."}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold bg-slate-50 px-4 py-2 rounded-xl">
                                    <Calendar className="h-4 w-4" />
                                    {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-slate-400 hover:text-indigo-600">
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HTML CONTENT CONTAINER */}
                    <div 
                        className="prose prose-slate max-w-none prose-img:rounded-[2rem] prose-img:shadow-xl prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 prose-strong:text-slate-900"
                        style={{ 
                            zoom: zoomLevel,
                            transformOrigin: 'top center'
                        }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </Card>
            </main>

            {/* Floating Exit Button (Fullscreen Only) */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 print:hidden",
                isFullscreen ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0 pointer-events-none"
            )}>
                <div className="flex items-center gap-2 p-2 bg-black/80 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl">
                    <div className="flex items-center px-4">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.7, z - 0.1))} className="h-8 w-8 text-white hover:bg-white/10"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-400 w-16 text-center uppercase">Zoom</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-white hover:bg-white/10"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <div className="w-px h-6 bg-white/20 mx-1" />
                    <Button 
                        onClick={toggleFullscreen} 
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-50 text-white font-bold border border-red-400/30 shadow-lg"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> Kapat
                    </Button>
                </div>
            </div>
        </div>
    );
}

