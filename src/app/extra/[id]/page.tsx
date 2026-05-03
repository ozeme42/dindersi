
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Download, Plus, Minus, Printer, Globe, Clock, 
    Share2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { Badge } from '@/components/ui/badge';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    
    const containerRef = useRef<HTMLDivElement>(null);
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
        fetchPage();
    }, [id]);

    // Script Runner: HTML içindeki scriptleri güvenli çalıştırmak için
    useEffect(() => {
        if (!page?.htmlContent || isLoading) return;

        // Global uyumluluk fonksiyonları
        (window as any).go = (n: number) => {
            if (n === -1) window.history.back();
        };

        // Scriptleri ayıkla ve yürüt
        const timer = setTimeout(() => {
            if (!contentRef.current) return;
            
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Identifier redeclaration hatalarını önlemek için IIFE ile sarmalıyoruz
                newScript.textContent = `(function(){ try { ${oldScript.textContent} } catch(e) { console.warn('Script execution error:', e); } })();`;
                document.body.appendChild(newScript);
                document.body.removeChild(newScript);
            });

            // initAdimAdim gibi bilinen fonksiyonları tetikle
            if (typeof (window as any).initAdimAdim === 'function') {
                try { (window as any).initAdimAdim(); } catch(e) {}
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [page?.htmlContent, isLoading]);

    // Fullscreen Takibi
    useEffect(() => {
        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
        else document.exitFullscreen();
    };

    const handlePrint = () => window.print();

    if (isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-bold animate-pulse">Döküman Hazırlanıyor...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-screen w-full flex items-center justify-center p-6 bg-slate-50">
                <Card className="max-w-md w-full p-8 text-center rounded-[2.5rem] border-red-100 shadow-xl bg-white">
                    <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Info className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Hata Oluştu</h2>
                    <p className="text-slate-500 mb-8">{error || "Aradığınız döküman bulunamadı veya silinmiş olabilir."}</p>
                    <Button onClick={() => router.back()} className="w-full h-12 bg-slate-900 hover:bg-slate-800 rounded-xl">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className={cn(
                "min-h-screen bg-slate-50 flex flex-col relative",
                isFullscreen ? "h-screen overflow-hidden" : "p-0 md:p-6 lg:p-8"
            )}
        >
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .prose { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
                }
                .document-content { zoom: ${zoomLevel}; transform-origin: top center; }
            `}</style>

            {/* ÜST ARAÇ ÇUBUĞU */}
            <header className={cn(
                "flex-shrink-0 z-30 transition-all duration-300 no-print",
                isFullscreen 
                    ? "absolute top-0 left-0 right-0 p-3 bg-white/80 backdrop-blur-md border-b border-slate-200 opacity-0 hover:opacity-100 focus-within:opacity-100 shadow-sm"
                    : "mb-6 container mx-auto bg-white/70 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            )}>
                <div className="flex items-center gap-4 min-w-0">
                    {!isFullscreen && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => router.back()} 
                            className="h-10 w-10 rounded-full hover:bg-slate-100 text-slate-500 shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="min-w-0">
                        <h1 className={cn("font-black text-slate-900 tracking-tight truncate leading-none uppercase", isFullscreen ? "text-lg" : "text-xl md:text-2xl")}>
                            {page.title}
                        </h1>
                        {!isFullscreen && (
                            <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                                <Badge variant="outline" className="text-[9px] font-black bg-indigo-50 text-indigo-600 border-indigo-100 px-1.5 py-0">
                                    {page.category || 'GENEL'}
                                </Badge>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 shrink-0">
                                    <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button onClick={handlePrint} variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-white" title="Yazdır">
                            <Printer className="h-5 w-5" />
                        </Button>
                        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-white" title="Tam Ekran">
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* İÇERİK ALANI */}
            <main className={cn(
                "flex-grow relative z-10 transition-all duration-500 overflow-y-auto custom-scrollbar",
                isFullscreen ? "bg-white" : "container mx-auto"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    <div 
                        ref={contentRef}
                        className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-justify prose-img:rounded-3xl prose-img:shadow-xl document-content"
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                    
                    {/* Alt Bilgi */}
                    {!isFullscreen && (
                        <div className="mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] no-print">
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                dindersiatolyesi.com | Dijital Materyal
                            </div>
                            <div>
                                Sayfa ID: {id}
                            </div>
                        </div>
                    )}
                </Card>
            </main>
        </div>
    );
}
