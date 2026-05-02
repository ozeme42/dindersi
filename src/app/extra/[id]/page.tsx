'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Download, Plus, Minus, Maximize, Minimize, 
    Printer, Share2, Globe, Bookmark, Calendar, Clock, Folder
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!params.id) return;
            setIsLoading(true);
            const res = await getExtraPage(params.id as string);
            if (res.success) {
                setContent(res.data);
            } else {
                setError(res.error || "İçerik yüklenemedi.");
            }
            setIsLoading(false);
        };
        fetchData();

        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [params.id]);

    const handlePrint = () => {
        const iframe = document.querySelector('iframe');
        if (iframe) {
            iframe.contentWindow?.print();
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-400 font-medium animate-pulse uppercase tracking-widest text-xs">Yükleniyor...</p>
            </div>
        );
    }

    if (error || !content) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-6">
                <Card className="max-w-md w-full bg-slate-900 border-red-500/20 text-center p-8 rounded-[2rem]">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Globe className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Hata Oluştu</h2>
                    <p className="text-slate-400 mb-8">{error || "Döküman bulunamadı."}</p>
                    <Button asChild className="w-full bg-white text-slate-950 hover:bg-slate-200 rounded-xl">
                        <Link href="/extra">Geri Dön</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    // Klasör yolunu breadcrumb formatında oluştur
    const pathParts = (content.category || 'Genel').split('/');

    const safeHtmlDocument = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                @media print { .no-print { display: none; } }
                body { 
                    zoom: ${zoomLevel}; 
                    transform-origin: top center; 
                    padding: 2rem; 
                    font-family: system-ui, -apple-system, sans-serif; 
                    background-color: white;
                    color: #1a1a1a;
                    line-height: 1.6;
                }
                img { max-width: 100%; height: auto; border-radius: 1rem; margin: 2rem 0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                h1, h2, h3 { color: #1e1b4b; font-weight: 800; margin-top: 2.5rem; margin-bottom: 1rem; }
                h1 { font-size: 2.5rem; border-bottom: 4px solid #4f46e5; padding-bottom: 1rem; }
                p { margin-bottom: 1.5rem; text-align: justify; }
                .card { background: #f8fafc; padding: 1.5rem; border-radius: 1rem; border: 1px solid #e2e8f0; margin: 1.5rem 0; }
            </style>
        </head>
        <body>
            <div class="max-w-4xl mx-auto">
                ${content.htmlContent}
            </div>
        </body>
        </html>
    `;

    return (
        <div 
            ref={containerRef}
            className={cn(
                "min-h-screen bg-white flex flex-col transition-all duration-500",
                isFullscreen ? "h-screen w-screen" : "bg-slate-50 p-4 md:p-6"
            )}
        >
            {/* Header ToolBar */}
            <header className={cn(
                "flex-shrink-0 z-30 flex items-center justify-between transition-all duration-300",
                isFullscreen 
                    ? "h-14 px-4 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm" 
                    : "mb-6 bg-white border border-slate-200 rounded-3xl p-4 shadow-xl shadow-slate-200/50"
            )}>
                <div className="flex items-center gap-4 min-w-0">
                    {!isFullscreen && (
                        <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl hover:bg-slate-100 flex-shrink-0">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-500" /></Link>
                        </Button>
                    )}
                    <div className="min-w-0">
                        <h1 className={cn("font-black text-slate-900 truncate uppercase tracking-tight leading-tight", isFullscreen ? "text-base" : "text-xl")}>
                            {content.title}
                        </h1>
                        <div className="flex items-center gap-2 mt-0.5 overflow-hidden">
                            <div className="flex items-center gap-1">
                                {pathParts.map((part, i) => (
                                    <React.Fragment key={i}>
                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[9px] font-black uppercase px-1.5 h-4">
                                            {part}
                                        </Badge>
                                        {i < pathParts.length - 1 && <span className="text-[9px] text-slate-300">/</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest hidden sm:inline">•</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest hidden sm:inline">
                                {content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-400 w-10 text-center">%{Math.round(zoomLevel * 100)}</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                    </div>

                    <Button onClick={handlePrint} variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100">
                        <Printer className="h-5 w-5" />
                    </Button>
                    
                    <FullscreenToggle elementRef={containerRef} className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 border-none" />
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 min-h-0 relative z-10 flex flex-col items-center">
                <div className={cn(
                    "w-full max-w-5xl h-full transition-all duration-500 overflow-hidden",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] border-4 border-white shadow-2xl ring-1 ring-slate-200/50"
                )}>
                    <iframe 
                        srcDoc={safeHtmlDocument}
                        className="w-full h-full border-none bg-white"
                        title={content.title}
                        sandbox="allow-scripts allow-same-origin allow-modals allow-popups"
                    />
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}
