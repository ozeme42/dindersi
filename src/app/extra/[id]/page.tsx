'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Plus, Minus, Download, 
    Maximize2, Minimize2, Home, Globe, Clock, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    useEffect(() => {
        const fetchPage = async () => {
            if (!id) return;
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchPage();
    }, [id]);

    // Dinamik JavaScript Yürütücü (dangerouslySetInnerHTML içindeki scriptler için)
    useEffect(() => {
        if (page?.htmlContent && !isLoading) {
            // go(-1) gibi global fonksiyonlar için uyumluluk
            (window as any).go = (n: number) => router.back();

            // Script'leri ayıkla ve güvenli bir şekilde yürüt
            const scripts = Array.from(containerRef.current?.querySelectorAll('script') || []);
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Fonksiyonların birbirini ezmesini engellemek için korumalı kapsam (IIFE)
                newScript.textContent = `(function(){ ${oldScript.textContent} })();`;
                document.body.appendChild(newScript);
                document.body.removeChild(newScript);
            });

            // Başlangıç fonksiyonlarını (initAdimAdim vb.) çağır
            const initFunctions = ['initAdimAdim', 'initApp'];
            setTimeout(() => {
                initFunctions.forEach(fn => {
                    if (typeof (window as any)[fn] === 'function') {
                        try { (window as any)[fn](); } catch(e) { console.warn(`Script Init Error (${fn}):`, e); }
                    }
                });
            }, 100);
        }
    }, [page?.htmlContent, isLoading, router]);

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !page) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white p-8 rounded-[2rem] border border-red-500/20 max-w-md w-full shadow-2xl">
                    <p className="text-red-600 mb-8 font-bold text-lg">{error || "İçerik bulunamadı."}</p>
                    <Button asChild size="lg" className="bg-slate-900 text-white hover:bg-slate-800 w-full rounded-xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500",
            isFullscreen ? "bg-white" : "bg-slate-50 p-4 md:p-8"
        )}>
            {/* Navigasyon Barı */}
            <header className={cn(
                "sticky top-0 z-40 transition-all duration-300 mb-8",
                isFullscreen 
                    ? "h-0 overflow-hidden opacity-0" 
                    : "bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-indigo-900/5 rounded-[2rem] p-4"
            )}>
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                         <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100 flex-shrink-0">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                         </Button>
                         <div className="min-w-0">
                             <h1 className="text-xl font-black text-slate-900 truncate tracking-tight uppercase">
                                {page.title}
                             </h1>
                             <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase">{page.category || 'Genel'}</Badge>
                                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                                </span>
                             </div>
                         </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-bold text-slate-500 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <FullscreenToggle elementRef={containerRef} className="bg-slate-900 text-white h-10 w-10 rounded-xl shadow-lg shadow-indigo-900/20" />
                    </div>
                </div>
            </header>

            {/* Döküman İçeriği */}
            <div className={cn(
                "transition-all duration-500",
                isFullscreen ? "bg-white" : "container mx-auto"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    <div 
                        ref={containerRef}
                        style={{ zoom: zoomLevel }}
                        className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:uppercase prose-p:text-slate-600 prose-img:rounded-3xl prose-img:shadow-2xl prose-a:text-indigo-600"
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </Card>
            </div>

            {/* Floating Zoom (Sadece Fullscreen iken) */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 flex items-center gap-3 p-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/50",
                isFullscreen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none"
            )}>
                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-10 w-10 text-white hover:bg-white/10 rounded-full"><Minus className="h-5 w-5"/></Button>
                <div className="w-px h-6 bg-white/20" />
                <span className="text-xs font-black text-white w-14 text-center">{Math.round(zoomLevel * 100)}%</span>
                <div className="w-px h-6 bg-white/20" />
                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-10 w-10 text-white hover:bg-white/10 rounded-full"><Plus className="h-5 w-5"/></Button>
                <div className="w-px h-6 bg-white/20" />
                <FullscreenToggle elementRef={containerRef} className="h-10 w-10 bg-red-600 hover:bg-red-500 text-white border-0 rounded-full" />
            </div>

            {/* Print Hider */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .prose { width: 100% !important; max-width: none !important; }
                }
            `}</style>
        </div>
    );
}
