'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Plus, Minus, Maximize2, Minimize2, 
    Download, Clock, Home, Settings, Smartphone, Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- ROBUST SCRIPT RUNNER ---
// Bu fonksiyon döküman içerisindeki <script> taglarını ayıklar,
// içindeki let/const ifadelerini var ile değiştirerek çakışmaları (SyntaxError) önler,
// ve fonksiyonları pencere (window) kapsamına bağlar.
const executeInlineScripts = (container: HTMLElement) => {
    const scripts = container.querySelectorAll('script');
    
    // go(-1) gibi navigasyon fonksiyonlarını tanımla
    if (typeof window !== 'undefined') {
        (window as any).go = (n: number) => window.history.go(n);
    }

    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        let scriptContent = oldScript.innerText;

        // SyntaxError: Identifier 'TOTAL' has already been declared hatasını çözmek için
        // let ve const ifadelerini var ile değiştiriyoruz (idempotent execution)
        scriptContent = scriptContent.replace(/\bconst\s+/g, 'var ');
        scriptContent = scriptContent.replace(/\blet\s+/g, 'var ');

        try {
            // Scriptleri global kapsama bağlamak için sarmalıyoruz
            newScript.text = `
                (function() {
                    try {
                        ${scriptContent}
                        // Fonksiyonları window'a taşı
                        const fns = Object.keys(this).filter(k => typeof this[k] === 'function');
                        fns.forEach(f => window[f] = this[f]);
                    } catch(e) { console.error('Script Error:', e); }
                }).call(window);
            `;
            oldScript.parentNode?.replaceChild(newScript, oldScript);
        } catch (e) {
            console.error("Script execution failed:", e);
        }
    });
};

function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!params?.id) return;
            setIsLoading(true);
            const res = await getExtraPage(params.id as string);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchData();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [params?.id]);

    // HTML render edildikten sonra scriptleri çalıştır
    useEffect(() => {
        if (!isLoading && page?.htmlContent && contentRef.current) {
            executeInlineScripts(contentRef.current);
        }
    }, [isLoading, page?.htmlContent]);

    if (isLoading) return <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /><p className="text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Döküman Hazırlanıyor</p></div>;

    if (error || !page) {
        return (
            <div className="h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-[2.5rem] p-8 text-center shadow-2xl">
                    <p className="text-red-400 text-lg font-bold mb-8 uppercase tracking-tight">{error || "Döküman bulunamadı."}</p>
                    <Button asChild className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl h-12">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5" /> Galeriye Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen bg-slate-950 text-white flex flex-col transition-all duration-500",
            isFullscreen ? "h-screen p-0" : "p-4 md:p-6"
        )}>
            {/* Nav Bar */}
            <div className={cn(
                "flex-shrink-0 z-50 flex items-center justify-between transition-all duration-500",
                isFullscreen ? "absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full opacity-0 hover:opacity-100 focus-within:opacity-100 shadow-2xl" : "mb-6"
            )}>
                <div className="flex items-center gap-4">
                    {!isFullscreen && (
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-11 w-11 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                    )}
                    <div className="flex flex-col">
                         <h1 className={cn("font-black tracking-tight uppercase truncate leading-none", isFullscreen ? "text-sm max-w-[200px]" : "text-xl md:text-3xl")}>
                            {page.title}
                         </h1>
                         {!isFullscreen && (
                            <div className="flex items-center gap-3 mt-1.5">
                                <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[9px] font-black uppercase">{page.category || 'Genel'}</Badge>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                                </span>
                            </div>
                         )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl p-1 shadow-inner">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 rounded-lg text-slate-400 hover:text-white"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-mono text-slate-500 w-10 text-center font-bold">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className="h-8 w-8 rounded-lg text-slate-400 hover:text-white"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <FullscreenToggle elementRef={containerRef} className="bg-slate-900 border border-white/10 h-10 w-10 rounded-xl shadow-lg" />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow relative z-10 flex flex-col min-h-0">
                <div className={cn(
                    "flex-grow bg-white text-slate-900 overflow-y-auto transition-all duration-500 custom-scrollbar relative",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] border-4 border-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                )}>
                    {/* HTML Content (Direct Injection) */}
                    <div 
                        ref={contentRef}
                        className="p-6 md:p-12 lg:p-16 mx-auto transition-all duration-300 transform-gpu origin-top"
                        style={{ zoom: zoomLevel }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                    
                    {/* Padding for end of document */}
                    <div className="h-32" />
                </div>

                {/* Floating Bottom Action (Exit FS) */}
                <div className={cn(
                    "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
                    isFullscreen ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
                )}>
                    <Button 
                        onClick={() => document.exitFullscreen()} 
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30 shadow-2xl"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> Çıkış
                    </Button>
                </div>
            </div>
            
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; color: black !important; }
                    .rounded-[2.5rem] { border: none !important; border-radius: 0 !important; }
                }
            `}</style>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>}>
            <ExtraPageViewer />
        </Suspense>
    );
}