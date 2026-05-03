
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize, Minimize, Plus, Minus, 
    Download, Globe, Share2, BookOpen, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const { id } = useParams();
    const router = useRouter();
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id as string);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Döküman yüklenemedi.");
            }
            setIsLoading(false);
        };
        fetchPage();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [id]);

    // Döküman içerisindeki scriptleri güvenli bir şekilde çalıştırma
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // go(-1) gibi global fonksiyonları destekle
            (window as any).go = (n: number) => {
                if (n === -1) router.back();
            };

            // HTML içindeki scriptleri ayıkla ve çalıştır
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Fonksiyonların window'a bağlanması ve Identifier çakışmalarını önlemek için kapsama al
                const scriptContent = `
                    (function() {
                        try {
                            ${oldScript.textContent}
                            // Kritik fonksiyonları global kapsama (window) zorla aktar
                            if (typeof showSection === 'function') window.showSection = showSection;
                            if (typeof toggleAccordion === 'function') window.toggleAccordion = toggleAccordion;
                            if (typeof initAdimAdim === 'function') window.initAdimAdim = initAdimAdim;
                            
                            // Eğer init fonksiyonu varsa hemen çalıştır
                            if (typeof initAdimAdim === 'function') {
                                setTimeout(initAdimAdim, 100);
                            }
                        } catch (e) {
                            console.warn("Script execution error:", e);
                        }
                    })();
                `;
                newScript.textContent = scriptContent;
                document.body.appendChild(newScript);
                // Script çalıştıktan sonra temizle
                setTimeout(() => document.body.removeChild(newScript), 500);
            });
        }
    }, [page?.htmlContent, router]);

    const handleDownload = async () => {
        if (!page) return;
        setIsDownloading(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = document.createElement('div');
            element.innerHTML = `
                <div style="padding: 40px; font-family: sans-serif;">
                    <h1 style="color: #1e1b4b; margin-bottom: 20px;">${page.title}</h1>
                    <div style="color: #64748b; margin-bottom: 30px;">${page.description || ''}</div>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 30px;" />
                    ${page.htmlContent}
                </div>
            `;
            const opt = { 
                margin: 10, 
                filename: `${page.title.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await html2pdf().set(opt).from(element).save();
        } catch (e) {
            alert("İndirme sırasında bir hata oluştu.");
        } finally {
            setIsDownloading(false);
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !page) {
        return (
            <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-[2rem] border border-red-100 shadow-xl max-w-md">
                    <p className="text-red-600 font-black text-xl mb-6 uppercase tracking-tight">{error || "Sayfa bulunamadı."}</p>
                    <Button asChild className="bg-slate-900 text-white rounded-xl w-full h-12">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500",
            isFullscreen ? "bg-white" : "bg-slate-50 py-6 md:py-12"
        )}>
            {/* Navigasyon Barı (Fullscreen değilse) */}
            {!isFullscreen && (
                <div className="container mx-auto px-4 mb-8">
                    <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                         <div className="flex items-center gap-4 w-full md:w-auto">
                             <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                             </Button>
                             <div className="min-w-0">
                                 <h1 className="font-black text-slate-900 uppercase truncate text-lg md:text-xl leading-none">
                                    {page.title}
                                 </h1>
                                 <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase mt-1 tracking-widest">{page.category || 'Genel'}</Badge>
                             </div>
                         </div>

                         <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                                <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                            </div>
                            <Button variant="outline" onClick={handleDownload} disabled={isDownloading} className="h-10 px-4 rounded-xl border-slate-200 bg-white gap-2 font-bold text-xs uppercase">
                                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4" />} PDF
                            </Button>
                            <Button onClick={toggleFullscreen} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 gap-2 font-bold text-xs uppercase shadow-lg shadow-indigo-100">
                                <Maximize className="h-4 w-4" /> Tam Ekran
                            </Button>
                         </div>
                    </div>
                </div>
            )}

            {/* İçerik Alanı */}
            <div className={cn(
                "transition-all duration-500",
                isFullscreen ? "bg-white" : "container mx-auto px-4"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh] border border-slate-200"
                )}>
                    <div 
                        ref={contentRef}
                        style={{ 
                            zoom: zoomLevel, 
                            transformOrigin: 'top center',
                        }}
                        className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-p:text-slate-600 prose-img:rounded-3xl prose-img:shadow-xl"
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </Card>
            </div>

            {/* Fullscreen Kapatma Butonu (Sadece Fullscreen iken) */}
            {isFullscreen && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
                    <Button 
                        onClick={toggleFullscreen} 
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30 shadow-2xl"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> Kapat
                    </Button>
                </div>
            )}
        </div>
    );
}

