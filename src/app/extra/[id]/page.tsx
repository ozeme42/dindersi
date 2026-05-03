'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, Minus, Maximize, Minimize, FileText, Calendar, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPageViewer() {
    const params = useParams();
    const id = params.id as string;
    
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fontSize, setFontSize] = useState(1.1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const fetchPage = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        const res = await getExtraPage(id);
        if (res.success) {
            setPage(res.data);
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => { fetchPage(); }, [fetchPage]);

    // Script Runner: showSection, initAdimAdim, go(-1) gibi fonksiyonları React içinde çalıştırmak için
    useEffect(() => {
        if (!isLoading && page?.htmlContent && contentRef.current) {
            const container = contentRef.current;
            
            // 1. go(-1) gibi global navigasyonları tanımla
            (window as any).go = (n: number) => window.history.go(n);

            // 2. HTML içindeki scriptleri ayıkla ve yürüt
            const scripts = Array.from(container.querySelectorAll('script'));
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // Scriptleri bir IIFE (Hemen Çağrılan Fonksiyon İfadesi) içine saralım
                // Bu sayede 'Identifier has already been declared' hatalarını önleriz
                // Ayrıca önemli fonksiyonları window nesnesine bağlayalım
                const scriptContent = `
                    (function() {
                        try {
                            ${oldScript.textContent}
                            
                            // Fonksiyonları global kapsama aç
                            if (typeof showSection === 'function') window.showSection = showSection;
                            if (typeof initAdimAdim === 'function') window.initAdimAdim = initAdimAdim;
                        } catch (e) {
                            console.warn("Script execution error:", e);
                        }
                    })();
                `;
                
                newScript.textContent = scriptContent;
                document.body.appendChild(newScript);
                
                // Temizlik için script tag'ini dökümandan kaldıralım (kod hafızada kalır)
                setTimeout(() => {
                    if (document.body.contains(newScript)) document.body.removeChild(newScript);
                }, 100);
            });

            // 3. Eğer dökümanda bir başlangıç fonksiyonu varsa tetikle
            // DOM'un yerleşmesi için kısa bir gecikme ekliyoruz
            setTimeout(() => {
                if (typeof (window as any).initAdimAdim === 'function') {
                    try {
                        (window as any).initAdimAdim();
                    } catch (e) {
                        console.warn("initAdimAdim call error:", e);
                    }
                }
            }, 200);
        }
    }, [isLoading, page?.htmlContent]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                <p className="text-slate-400 font-medium animate-pulse">Döküman Yükleniyor...</p>
            </div>
        );
    }

    if (!page) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-50">
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-200 max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">Döküman Bulunamadı</h2>
                    <p className="text-slate-500 mb-8 font-medium">Ulaşmaya çalıştığınız içerik silinmiş veya taşınmış olabilir.</p>
                    <Button asChild className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-lg font-bold">
                        <Link href="/extra">Galeriye Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen transition-colors duration-500 flex flex-col font-sans",
            isFullscreen ? "bg-white p-0" : "bg-slate-50 p-4 md:p-8"
        )}>
            {/* Toolbar */}
            <header className={cn(
                "z-40 transition-all duration-300",
                isFullscreen 
                    ? "fixed top-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-b border-slate-200 opacity-0 hover:opacity-100 flex items-center justify-between" 
                    : "max-w-5xl mx-auto w-full mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            )}>
                 <div className="flex items-center gap-4">
                         {!isFullscreen && (
                            <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link>
                            </Button>
                         )}
                         <div className="min-w-0">
                            <h1 className={cn("font-black text-slate-900 uppercase tracking-tight leading-none", isFullscreen ? "text-lg truncate" : "text-3xl md:text-4xl")}>
                                {page.title}
                            </h1>
                            {!isFullscreen && (
                                <div className="flex items-center gap-3 mt-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    <Badge variant="outline" className="bg-white border-slate-200 text-slate-500">{page.category || 'Genel'}</Badge>
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}</span>
                                </div>
                            )}
                         </div>
                 </div>

                 <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                        <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.max(0.5, s - 0.1))} className="h-9 w-9 rounded-lg text-slate-500"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-400 w-12 text-center uppercase">Boyut</span>
                        <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.min(3, s + 0.1))} className="h-9 w-9 rounded-lg text-slate-500"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <Button onClick={toggleFullscreen} variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-indigo-600 hover:bg-indigo-50">
                        {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                    </Button>
                 </div>
            </header>

            {/* Content Area */}
            <div className={cn(
                "flex-grow relative z-10 transition-all duration-500",
                isFullscreen ? "bg-white" : "max-w-5xl mx-auto w-full pb-20"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    <CardContent className="p-0">
                         {page.description && !isFullscreen && (
                            <div className="mb-10 p-6 bg-slate-50 rounded-3xl border-l-4 border-indigo-500 flex items-start gap-4">
                                <Info className="h-6 w-6 text-indigo-500 shrink-0 mt-1" />
                                <p className="text-slate-600 font-medium italic leading-relaxed">{page.description}</p>
                            </div>
                        )}
                        
                        {/* ASIL İÇERİK: Iframe kullanmadan doğrudan DOM'a basıyoruz */}
                        <div 
                            ref={contentRef}
                            style={{ fontSize: `${fontSize}rem` }}
                            className="prose prose-slate max-w-none prose-headings:font-black prose-p:leading-relaxed prose-img:rounded-3xl prose-a:text-indigo-600"
                            dangerouslySetInnerHTML={{ __html: page.htmlContent }} 
                        />
                    </CardContent>
                </Card>
            </div>

            <style jsx global>{`
                .print-hide { display: block; }
                @media print {
                    .print-hide { display: none !important; }
                    body { background: white; }
                    .prose { max-width: 100% !important; }
                }
                
                /* Adım Adım veya showSection içeriği için özel stiller */
                .adim-adim-section { transition: opacity 0.3s ease-in-out; }
                .adim-adim-section[style*="display: none"] { opacity: 0; }
                .adim-adim-section[style*="display: block"] { opacity: 1; }
            `}</style>
        </div>
    );
}

const X = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
