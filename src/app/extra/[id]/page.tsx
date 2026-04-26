'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Plus, Minus, Maximize2, Minimize2, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

const MagnificentLightBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-cyan-50/40 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-50/40 rounded-full blur-[100px]" />
    </div>
);

function ExtraPageView() {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPageData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const result = await getExtraPage(id);
                if (result.success && result.data) {
                    setPage(result.data);
                } else {
                    setError(result.error || "Döküman bulunamadı.");
                }
            } catch (e) {
                console.error(e);
                setError("İçerik yüklenirken bir hata oluştu.");
            }
            setIsLoading(false);
        };
        fetchPageData();
    }, [id]);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    if (isLoading) return <div className="h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-cyan-600" /></div>;

    if (error || !page) {
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

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
            <MagnificentLightBackground />
            
            <header className={cn(
                "sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all",
                isFullscreen ? "h-0 p-0 overflow-hidden border-0" : "pt-4"
            )}>
                <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5 w-full md:w-auto">
                        <Link href="/extra">
                            <button className="group relative flex items-center justify-center h-12 px-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-cyan-200 transition-all duration-300 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative flex items-center gap-2">
                                    <ArrowLeft className="h-5 w-5 text-slate-600 group-hover:text-white group-hover:-translate-x-1 transition-all duration-300" />
                                    <span className="font-black text-xs uppercase tracking-widest text-slate-600 group-hover:text-white transition-colors duration-300">GERİ</span>
                                </div>
                            </button>
                        </Link>
                        <div className="hidden md:block h-8 w-[1px] bg-slate-200 mx-2" />
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-black text-slate-800 tracking-tighter line-clamp-1">{page.title}</h1>
                            <p className="text-[10px] text-cyan-600 font-black uppercase tracking-widest">Özel Döküman</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-bold text-slate-500 w-12 text-center uppercase">Zoom</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-md"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <FullscreenToggle elementRef={containerRef} className="bg-slate-100 border-slate-200 text-slate-600 h-10 w-10 rounded-xl" />
                    </div>
                </div>
            </header>

            <main className="flex-1 relative z-10">
                <div ref={containerRef} className={cn("w-full relative flex flex-col bg-white", isFullscreen ? "fixed inset-0 z-[100] h-screen" : "h-[calc(100vh-88px)] border-t border-slate-200")}>
                    <iframe 
                        srcDoc={page.htmlContent + `<style>body { zoom: ${zoomLevel}; transform-origin: top center; padding: 20px; font-family: sans-serif; }</style>`} 
                        className="w-full h-full border-0 bg-white" 
                        sandbox="allow-scripts allow-same-origin"
                    />
                </div>
            </main>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-cyan-600" /></div>}>
            <ExtraPageView />
        </Suspense>
    );
}