
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Download, Plus, Minus, 
    Maximize, Minimize, Printer, Clock, Folder,
    Share2, Bookmark
} from 'lucide-react';
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

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    useEffect(() => {
        const fetchPage = async () => {
            if (!id) return;
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchPage();
    }, [id]);

    // HTML içeriğindeki scriptleri çalıştıran mekanizma (Script Runner)
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // Identifier çakışmalarını önlemek için IIFE (Anında çalışan fonksiyon) yapısı kuruyoruz
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Değişken çakışmasını önlemek için içeriği bir blok {} içine alıyoruz
                newScript.textContent = `{ (function() { ${oldScript.textContent} })(); }`;
                document.body.appendChild(newScript);
                document.body.removeChild(newScript);
            });
            
            // Eğer içerikte showSection veya initAdimAdim gibi global fonksiyonlar gerekiyorsa,
            // döküman yüklendiğinde otomatik tetikleme yapılabilir:
            if (window.hasOwnProperty('initAdimAdim')) {
                try { (window as any).initAdimAdim(); } catch(e) {}
            }
        }
    }, [page?.htmlContent]);

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !page) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full p-8 text-center rounded-[2rem] border-red-100 shadow-xl">
                    <p className="text-red-500 font-bold text-lg mb-6">{error || "Döküman yüklenemedi."}</p>
                    <Button asChild className="w-full bg-slate-900 text-white rounded-xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4"/> Geri Dön</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn("min-h-screen bg-slate-50 flex flex-col relative", isFullscreen ? "bg-white p-0" : "pb-20")}>
            
            {/* Header Control Bar */}
            <header className={cn(
                "sticky top-0 z-50 w-full transition-all duration-300",
                isFullscreen 
                    ? "h-12 bg-white/80 backdrop-blur-md border-b border-slate-100 opacity-0 hover:opacity-100 px-4" 
                    : "h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6"
            )}>
                <div className="container mx-auto h-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10 shrink-0">
                            <ArrowLeft className="h-5 w-5 text-slate-600" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className={cn("font-black tracking-tight text-slate-900 truncate", isFullscreen ? "text-base" : "text-xl md:text-2xl")}>
                                {page.title}
                            </h1>
                            {!isFullscreen && (
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-slate-200 text-slate-400 bg-slate-50 h-4">
                                        DÖKÜMAN
                                    </Badge>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Folder className="h-2.5 w-2.5 text-amber-500" /> {page.category || 'Genel'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} className="h-8 w-8 text-slate-500 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-400 w-12 text-center uppercase">%{Math.round(zoomLevel * 100)}</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))} className="h-8 w-8 text-slate-500 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => window.print()} className="rounded-xl border-slate-200 text-slate-600 h-10 w-10 hidden md:flex">
                            <Printer className="h-4 w-4" />
                        </Button>
                        <FullscreenToggle elementRef={containerRef} className="rounded-xl border-slate-200 text-slate-600 h-10 w-10" />
                    </div>
                </div>
            </header>

            {/* Döküman İçeriği - Çerçevesiz */}
            <main className={cn(
                "flex-grow relative z-10 w-full bg-white",
                !isFullscreen && "container mx-auto px-4 md:px-8 lg:px-12 py-12 rounded-[2rem] shadow-2xl shadow-slate-200/50 mt-8 border border-slate-100"
            )}>
                <div 
                    ref={contentRef}
                    className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 prose-img:rounded-[2rem] prose-img:shadow-xl"
                    style={{ zoom: zoomLevel }}
                    dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                />
            </main>

            {/* Alt Bilgi Barı */}
            {!isFullscreen && (
                <footer className="container mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-200 mt-12 bg-white/50 backdrop-blur-sm rounded-t-[3rem]">
                    <div className="flex items-center gap-4 text-slate-400">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Güncelleme: {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="ghost" className="text-slate-500 hover:text-indigo-600 gap-2 font-bold uppercase text-xs tracking-widest">
                            <Share2 className="h-4 w-4" /> Paylaş
                        </Button>
                        <Button variant="ghost" className="text-slate-500 hover:text-amber-600 gap-2 font-bold uppercase text-xs tracking-widest">
                            <Bookmark className="h-4 w-4" /> Kaydet
                        </Button>
                    </div>
                </footer>
            )}
        </div>
    );
}

export default function ExtraPageWrapper() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}
