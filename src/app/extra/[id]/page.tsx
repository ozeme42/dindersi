'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Globe, Printer, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

function ExtraPageViewer() {
    const params = useParams();
    const id = params.id as string;

    const [content, setContent] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.0);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setContent(res.data);
            } else {
                setError(res.error || "İçerik yüklenemedi.");
            }
            setIsLoading(false);
        };
        fetchData();
    }, [id]);

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !content) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white p-8 rounded-3xl border border-red-500/20 max-w-md w-full shadow-xl">
                    <p className="text-red-600 mb-6 font-medium text-lg">{error || "İçerik bulunamadı."}</p>
                    <Button asChild className="bg-slate-900 text-white hover:bg-slate-800 w-full">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const safeHtmlDocument = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { 
                    zoom: ${zoomLevel}; 
                    transform-origin: top center; 
                    padding: 2rem; 
                    font-family: system-ui, -apple-system, sans-serif; 
                    margin: 0;
                    background-color: white;
                    color: #1e293b;
                }
                .prose { max-width: 65ch; margin: 0 auto; }
                img { max-width: 100%; height: auto; border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); }
            </style>
        </head>
        <body class="prose prose-slate">
            ${content.htmlContent}
        </body>
        </html>
    `;

    return (
        <div ref={mainContentRef} className="h-screen w-screen bg-slate-50 flex flex-col overflow-hidden relative font-sans">
            <header className={cn(
                "flex-shrink-0 z-20 flex items-center justify-between p-4 transition-all duration-300",
                isFullscreen 
                    ? "absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 opacity-0 hover:opacity-100 focus-within:opacity-100 shadow-sm" 
                    : "bg-white border-b border-slate-200"
            )}>
                <div className="flex items-center gap-4 min-w-0">
                    {!isFullscreen && (
                        <Button asChild variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-slate-900">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5"/></Link>
                        </Button>
                    )}
                    <div className="truncate">
                        <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight">{content.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase">{content.category}</Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-bold text-slate-500 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => window.print()} className="h-10 w-10 text-slate-600 bg-white border-slate-200 rounded-xl hover:bg-slate-50">
                        <Printer className="h-5 w-5" />
                    </Button>
                    <FullscreenToggle elementRef={mainContentRef} className="bg-slate-900 text-white hover:bg-slate-800 border-0 h-10 w-10 rounded-xl shadow-lg" />
                </div>
            </header>

            <main className="flex-1 bg-white relative">
                <iframe 
                    srcDoc={safeHtmlDocument} 
                    className="w-full h-full border-0" 
                    sandbox="allow-scripts allow-same-origin"
                    title={content.title}
                />
            </main>
        </div>
    );
}

export default function ExtraIDPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}