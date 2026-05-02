'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, Minus, Download, Maximize, Minimize, Printer, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

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
        const fetchPage = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const res = await getExtraPage(id);
                if (res.success) {
                    setContent(res.data);
                } else {
                    setError(res.error || "Döküman bulunamadı.");
                }
            } catch (e) {
                setError("Veri çekme hatası.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPage();

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
                    <style>
                        body { padding: 40px; font-family: sans-serif; }
                        h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    <h1>${content.title}</h1>
                    ${content.htmlContent}
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;
    
    if (error || !content) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
                <div className="bg-white p-10 rounded-[3rem] border border-red-100 shadow-2xl max-w-md">
                    <p className="text-red-600 text-xl font-black uppercase tracking-tight mb-8">{error || "Döküman bulunamadı."}</p>
                    <Button asChild className="bg-slate-900 text-white rounded-2xl h-14 px-8 w-full font-bold">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Galeriye Dön</Link>
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
                    padding: 30px; 
                    font-family: system-ui, -apple-system, sans-serif; 
                    background: white;
                    color: #1e293b;
                    line-height: 1.6;
                }
                .prose h1 { font-size: 2.5em; font-weight: 800; color: #1e1b4b; margin-bottom: 0.5em; border-bottom: 3px solid #6366f1; padding-bottom: 0.2em; }
                .prose h2 { font-size: 1.8em; font-weight: 700; color: #4338ca; margin-top: 1.5em; }
                .prose p { margin: 1em 0; font-size: 1.1em; text-align: justify; }
                img { max-width: 100%; height: auto; border-radius: 1rem; margin: 2rem 0; shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; border-radius: 0.5rem; overflow: hidden; }
                th { background: #f8fafc; font-weight: bold; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
                td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
            </style>
        </head>
        <body class="prose max-w-none">
            ${content.htmlContent}
        </body>
        </html>
    `;

    return (
        <div ref={containerRef} className={cn("min-h-screen bg-white flex flex-col overflow-hidden relative", isFullscreen ? "fixed inset-0 z-50" : "")}>
            
            <header className="flex-shrink-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4 min-w-0">
                    {!isFullscreen && (
                        <Link href="/extra">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-50 border border-slate-200">
                                <ArrowLeft className="h-5 w-5 text-slate-500" />
                            </Button>
                        </Link>
                    )}
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight">{content.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase">{content.category}</Badge>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-200">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-400 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <Button variant="outline" size="icon" onClick={handlePrint} className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"><Printer className="h-5 w-5"/></Button>
                    <FullscreenToggle elementRef={containerRef} className="h-10 w-10 rounded-xl bg-slate-900 text-white hover:bg-slate-800" />
                </div>
            </header>

            <div className="flex-1 bg-slate-100 p-4 md:p-8 overflow-y-auto">
                <div className={cn(
                    "mx-auto bg-white transition-all duration-500 shadow-2xl",
                    isFullscreen ? "w-full min-h-full" : "max-w-5xl rounded-[2rem] min-h-[calc(100vh-160px)]"
                )}>
                    <iframe 
                        srcDoc={safeHtml} 
                        className="w-full h-full min-h-[calc(100vh-200px)] border-0 rounded-[2rem] block"
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}
