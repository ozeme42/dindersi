
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Printer, Plus, Minus, Download, FileText, Share2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const id = params.id as string;
    
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1);
    
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            if (!id) return;
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

        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, [id]);

    // HTML İçeriğindeki Script'leri Güvenli Şekilde Çalıştıran Mekanizma
    useEffect(() => {
        if (!page?.htmlContent) return;

        // Kısa bir gecikme: DOM'un yerleştiğinden emin olalım
        const timer = setTimeout(() => {
            // HTML içindeki script tag'lerini buluyoruz
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = page.htmlContent;
            const scriptTags = tempDiv.querySelectorAll('script');

            // Global uyumluluk katmanı (ReferenceError: go is not defined gibi hataları önler)
            (window as any).go = (n: number) => window.history.go(n);

            scriptTags.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // Script içeriğini kopyala ve "IIFE" içine alarak değişken çakışmalarını önle
                // Ayrıca dökümandaki fonksiyonları global window nesnesine bağla
                const rawCode = oldScript.textContent || "";
                
                // Fonksiyon tanımlamalarını tespit edip window'a bağlayan regex
                // Örn: function showSection(...) -> window.showSection = function(...)
                const enhancedCode = rawCode.replace(/function\s+([a-zA-Z0-9_]+)\s*\(/g, (match, p1) => {
                    return `window.${p1} = function(`;
                });

                newScript.textContent = `
                    (function() {
                        try {
                            ${enhancedCode}
                        } catch (err) {
                            console.error("Döküman script hatası:", err);
                        }
                    })();
                `;
                
                document.body.appendChild(newScript);
                // Script çalıştıktan sonra temizle
                document.body.removeChild(newScript);
            });

            // Sayfa yüklendiğinde otomatik çalışması gereken bir init fonksiyonu varsa (örn: adim adim içerikler)
            if (typeof (window as any).initAdimAdim === 'function') {
                try { (window as any).initAdimAdim(); } catch(e) {}
            }
        }, 100);

        return () => clearTimeout(timer);
    }, [page?.htmlContent]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: page.title,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Bağlantı kopyalandı.");
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen bg-white flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-400 font-medium">İçerik Yükleniyor...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-200">
                    <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <FileText className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Döküman Bulunamadı</h2>
                    <p className="text-slate-500 mb-8">{error || "Ulaşmaya çalıştığınız içerik silinmiş veya yayından kaldırılmış olabilir."}</p>
                    <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl h-12">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Navigasyon Çubuğu */}
            <header className={cn(
                "sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all",
                isFullscreen ? "h-0 overflow-hidden border-0" : "py-4"
            )}>
                <div className="container mx-auto px-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                         {!isFullscreen && (
                            <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                            </Button>
                         )}
                         <div className="min-w-0">
                             <h1 className="text-lg font-black text-slate-900 truncate tracking-tight uppercase leading-none">{page.title}</h1>
                             <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 uppercase bg-slate-100 text-slate-500">{page.category || 'Genel'}</Badge>
                             </div>
                         </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Zoom Kontrolleri */}
                        <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.7, z - 0.1))} className="h-8 w-8 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="h-8 w-8 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>
                        
                        <Button variant="outline" size="icon" onClick={handlePrint} className="rounded-xl border-slate-200 text-slate-600 h-11 w-11"><Printer className="h-5 w-5" /></Button>
                        <Button variant="outline" size="icon" onClick={handleShare} className="rounded-xl border-slate-200 text-slate-600 h-11 w-11"><Share2 className="h-5 w-5" /></Button>
                        <Button variant="outline" size="icon" onClick={toggleFullscreen} className="rounded-xl bg-slate-900 text-white border-slate-900 h-11 w-11">
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Döküman İçeriği */}
            <div className={cn(
                "flex-1 transition-all duration-500",
                isFullscreen ? "bg-white" : "container mx-auto py-8 px-4 md:py-12"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    {/* Rendered HTML */}
                    <div 
                        ref={contentRef}
                        className="prose prose-slate max-w-none w-full animate-in fade-in duration-700"
                        style={{ 
                            fontSize: `${zoom}rem`,
                            transformOrigin: 'top center'
                        }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </Card>
            </div>
            
            {/* Yazdırma Modu İçin CSS */}
            <style jsx global>{`
                @media print {
                    header, button, .no-print { display: none !important; }
                    .container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
                    .prose { font-size: 12pt !important; color: black !important; }
                    body { background: white !important; }
                    .shadow-2xl { box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
}
