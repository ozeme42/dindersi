'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, Minus, Maximize, Minimize, Type, Printer, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchContent = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        const res = await getExtraPage(id);
        if (res.success) {
            setContent(res.data);
        } else {
            setError(res.error || "İçerik yüklenemedi.");
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => {
        fetchContent();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [fetchContent]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">İçerik Hazırlanıyor</p>
            </div>
        );
    }

    if (error || !content) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-6">
                <div className="bg-white p-10 rounded-[2.5rem] border border-red-100 shadow-2xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <ArrowLeft className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">HATA</h2>
                    <p className="text-slate-500 mb-8">{error || "Döküman bulunamadı."}</p>
                    <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 h-14 rounded-2xl text-lg">
                        <Link href="/extra">Arşive Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const safeHtmlDocument = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                body { 
                    zoom: ${zoomLevel}; 
                    transform-origin: top center; 
                    padding: 40px; 
                    font-family: 'Inter', sans-serif; 
                    margin: 0;
                    background-color: white;
                    color: #1e293b;
                    line-height: 1.6;
                }
                @media print {
                    body { padding: 0; zoom: 1 !important; }
                    .no-print { display: none !important; }
                }
                img { max-width: 100%; height: auto; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                h1, h2, h3 { color: #4f46e5; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; }
                p { margin-bottom: 1.2em; text-align: justify; }
                ul, ol { padding-left: 1.5em; margin-bottom: 1.2em; }
                li { margin-bottom: 0.5em; }
            </style>
        </head>
        <body>
            ${content.htmlContent}
        </body>
        </html>
    `;

    return (
        <div className="h-screen w-screen bg-slate-100 flex flex-col overflow-hidden relative selection:bg-indigo-100">
            {/* Header / Toolbar */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 z-30 shadow-sm no-print">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Button variant="ghost" size="icon" asChild className="rounded-xl h-12 w-12 hover:bg-slate-100">
                            <Link href="/extra"><ArrowLeft className="h-6 w-6 text-slate-600"/></Link>
                        </Button>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight">{content.title}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase">{content.category}</Badge>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Zoom Controls */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <div className="flex items-center justify-center w-14 gap-1">
                                <Type className="h-3 w-3 text-slate-400" />
                                <span className="text-xs font-black text-slate-600">{Math.round(zoomLevel * 100)}%</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>

                        <Button variant="outline" size="icon" onClick={handlePrint} className="h-11 w-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Printer className="h-5 w-5" />
                        </Button>
                        
                        <Button variant="outline" size="icon" onClick={toggleFullscreen} className="h-11 w-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main ref={containerRef} className={cn(
                "flex-grow relative overflow-hidden bg-slate-100 transition-all duration-500",
                isFullscreen ? "p-0" : "p-4 md:p-8"
            )}>
                <div className={cn(
                    "w-full h-full mx-auto max-w-6xl shadow-2xl transition-all duration-500 overflow-hidden",
                    isFullscreen ? "rounded-none" : "rounded-3xl border-4 border-white ring-1 ring-slate-200"
                )}>
                    <iframe 
                        srcDoc={safeHtmlDocument} 
                        className="w-full h-full border-0 bg-white" 
                        sandbox="allow-scripts allow-same-origin allow-popups"
                        title={content.title}
                    />
                </div>
            </main>
        </div>
    );
}
