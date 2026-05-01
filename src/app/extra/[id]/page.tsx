
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Plus, Minus, Maximize, 
    Minimize, Globe, Tag, Clock, Share2, 
    Printer, Maximize2, Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

export default function ExtraPageDisplay() {
    const params = useParams();
    const id = params.id as string;
    
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            }
            setIsLoading(false);
        };
        fetchPage();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [id]);

    if (isLoading) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200 max-w-md">
                    <h2 className="text-2xl font-black text-slate-800 mb-4">Döküman Bulunamadı</h2>
                    <p className="text-slate-500 mb-8">Aradığınız sayfa silinmiş veya taşınmış olabilir.</p>
                    <Link href="/extra" className="w-full">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-12">
                            <ArrowLeft className="mr-2 h-5 w-5" /> Arşive Dön
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Iframe içine basılacak güvenli HTML yapısı
    // Tailwind desteği ve zoom ayarı eklendi
    const safeHtml = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { 
                    zoom: ${zoomLevel}; 
                    transform-origin: top center; 
                    padding: 2rem; 
                    font-family: system-ui, -apple-system, sans-serif; 
                    background-color: white;
                    color: #1e293b;
                    line-height: 1.6;
                }
                img { max-width: 100%; height: auto; border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
                h1 { font-weight: 800; font-size: 2.5rem; margin-bottom: 1.5rem; color: #1e1b4b; border-bottom: 4px solid #4f46e5; padding-bottom: 0.5rem; display: inline-block; }
                h2 { font-weight: 700; font-size: 1.8rem; margin-top: 2rem; margin-bottom: 1rem; color: #4338ca; }
                p { margin-bottom: 1.25rem; text-align: justify; }
                ul, ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
                li { margin-bottom: 0.5rem; }
            </style>
        </head>
        <body class="prose prose-slate max-w-none">
            ${page.htmlContent}
        </body>
        </html>
    `;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans">
            
            {/* Header / Toolbar */}
            <header className={cn(
                "flex-shrink-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-300",
                isFullscreen ? "h-0 p-0 overflow-hidden border-0" : "p-4"
            )}>
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Link href="/extra">
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-slate-100">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div className="overflow-hidden">
                            <h1 className="text-lg font-black text-slate-900 truncate leading-tight uppercase tracking-tight">
                                {page.title}
                            </h1>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                <span className="flex items-center gap-1 text-indigo-600">
                                    <Tag className="h-3 w-3" /> {page.category || 'Genel'}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Zoom Kontrolleri */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg">
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase">
                                {Math.round(zoomLevel * 100)}%
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button variant="outline" size="icon" onClick={() => window.print()} className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                            <Printer className="h-5 w-5" />
                        </Button>
                        
                        <FullscreenToggle elementRef={containerRef} className="bg-indigo-600 text-white hover:bg-indigo-700 border-0 h-10 w-10 rounded-xl shadow-lg shadow-indigo-200" />
                    </div>
                </div>
            </header>

            {/* İçerik Alanı - TAM SAYFA */}
            <main ref={containerRef} className={cn(
                "flex-grow relative z-10 transition-all duration-300 bg-white",
                isFullscreen ? "fixed inset-0 h-screen w-screen" : "h-[calc(100vh-81px)]"
            )}>
                {/* Fullscreen ikonu sadece tam ekrandayken sağ üstte yüzer vaziyette görünsün */}
                {isFullscreen && (
                    <div className="absolute top-4 right-4 z-[100] opacity-0 hover:opacity-100 transition-opacity">
                         <Button onClick={() => document.exitFullscreen()} variant="outline" size="icon" className="h-12 w-12 rounded-full bg-white/80 border-slate-200 shadow-xl">
                            <Minimize2 className="h-6 w-6 text-slate-700" />
                         </Button>
                    </div>
                )}

                <iframe 
                    srcDoc={safeHtml} 
                    className="w-full h-full border-0 bg-white"
                    title={page.title}
                    sandbox="allow-scripts allow-same-origin allow-popups"
                />
            </main>
        </div>
    );
}
