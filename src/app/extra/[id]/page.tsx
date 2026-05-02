'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Printer, Plus, Minus, Maximize, Minimize, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';

function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setContent(res.data);
            } else {
                setError(res.error || "Sayfa bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchData();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [id]);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow && content) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>${content.title}</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <style>
                            body { padding: 40px; }
                            @media print { .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        <h1 class="text-3xl font-bold mb-6 border-b pb-4">${content.title}</h1>
                        <div>${content.htmlContent}</div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    if (isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !content) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-slate-900 p-8 rounded-3xl border border-red-500/20 max-w-md w-full shadow-2xl">
                    <p className="text-red-400 text-xl mb-8 font-bold">{error || "İçerik bulunamadı."}</p>
                    <Button asChild size="lg" className="w-full bg-slate-800 hover:bg-slate-700">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const safeHtml = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    body { 
                        zoom: ${zoomLevel}; 
                        transform-origin: top center; 
                        padding: 20px; 
                        font-family: system-ui, -apple-system, sans-serif; 
                        background-color: white;
                        color: #1e293b;
                    }
                    img { max-width: 100%; height: auto; border-radius: 12px; margin: 1.5rem 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
                </style>
            </head>
            <body class="prose prose-slate max-w-none">
                ${content.htmlContent}
            </body>
        </html>
    `;

    return (
        <div ref={containerRef} className="h-screen bg-slate-50 flex flex-col overflow-hidden relative">
            <header className={cn(
                "flex-shrink-0 z-30 flex items-center justify-between transition-all duration-300",
                isFullscreen 
                    ? "absolute top-0 left-0 right-0 p-2 bg-white/80 backdrop-blur-md border-b border-slate-200 opacity-0 hover:opacity-100 focus-within:opacity-100 shadow-sm" 
                    : "p-4 bg-white border-b border-slate-200 shadow-sm"
            )}>
                <div className="flex items-center gap-4 overflow-hidden">
                    <Button variant="ghost" size="icon" asChild className="shrink-0 h-10 w-10 text-slate-400 hover:text-indigo-600 rounded-full">
                        <Link href="/extra"><ArrowLeft className="h-6 w-6"/></Link>
                    </Button>
                    <div className="overflow-hidden">
                        <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight leading-none">{content.title}</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase py-0 px-2">{content.category}</Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-400 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                    </div>
                    
                    <Button variant="outline" size="icon" onClick={handlePrint} className="h-10 w-10 border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl">
                        <Printer className="h-5 w-5" />
                    </Button>

                    <FullscreenToggle elementRef={containerRef} className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-200 rounded-xl" />
                </div>
            </header>

            <main className="flex-1 bg-slate-100/50 p-2 md:p-6 overflow-hidden">
                <div className={cn(
                    "w-full h-full bg-white transition-all duration-300 shadow-2xl overflow-hidden",
                    isFullscreen ? "rounded-none" : "rounded-3xl border-4 border-white ring-1 ring-slate-200"
                )}>
                    <iframe 
                        srcDoc={safeHtml} 
                        className="w-full h-full border-0" 
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}
