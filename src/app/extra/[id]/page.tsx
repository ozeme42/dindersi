
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    ArrowLeft, Maximize, Minimize, Minus, Plus, 
    Loader2, Globe, FileText, Clock, Share2, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    Card, CardContent, CardHeader, CardTitle, 
    CardDescription, CardFooter 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1.1);
    const contentRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        if (!params?.id) return;
        setIsLoading(true);
        const res = await getExtraPage(params.id as string);
        if (res.success) {
            setPage(res.data);
        } else {
            setError(res.error || "İçerik yüklenemedi.");
        }
        setIsLoading(false);
    }, [params?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Script Runner: HTML içeriğindeki script'leri güvenli bir şekilde çalıştırır
    useEffect(() => {
        if (page?.htmlContent && typeof window !== 'undefined') {
            // go(-1) uyumluluğu
            (window as any).go = (n: number) => {
                if (n === -1) router.back();
            };

            const container = contentRef.current;
            if (!container) return;

            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // SyntaxError (Redeclaration) önlemek için korumalı kapsama al
                newScript.textContent = `(function(){ try { ${oldScript.textContent} } catch(e){ console.warn('Script error:', e); } })();`;
                oldScript.parentNode?.replaceChild(newScript, oldScript);
            });

            // DOM hazır olduğunda init fonksiyonunu tetikle
            setTimeout(() => {
                if (typeof (window as any).initAdimAdim === 'function') {
                    try { (window as any).initAdimAdim(); } catch(e) {}
                }
            }, 100);
        }
    }, [page?.htmlContent, router]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="flex h-screen items-center justify-center p-8 text-center bg-slate-50">
                <div className="max-w-md space-y-4">
                    <p className="text-red-500 font-bold text-lg">{error || "Sayfa bulunamadı."}</p>
                    <Button asChild className="rounded-xl"><Link href="/extra">Geri Dön</Link></Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500",
            isFullscreen ? "bg-white p-0" : "bg-slate-50 p-4 md:p-8"
        )}>
            {/* Üst Kontrol Paneli */}
            <div className={cn(
                "sticky top-0 z-50 mb-6 transition-all",
                isFullscreen ? "bg-white/90 border-b p-2" : "bg-white/80 backdrop-blur-md rounded-3xl border border-white shadow-lg p-4 max-w-7xl mx-auto"
            )}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                         {!isFullscreen && (
                            <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                            </Button>
                         )}
                         <div className="min-w-0">
                             <h1 className={cn("font-black text-slate-900 uppercase truncate leading-none", isFullscreen ? "text-base" : "text-xl md:text-2xl")}>
                                 {page.title}
                             </h1>
                             {!isFullscreen && (
                                 <div className="flex items-center gap-3 mt-1.5 overflow-hidden">
                                     <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] uppercase tracking-widest">{page.category || 'Genel'}</Badge>
                                     <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold whitespace-nowrap">
                                         <Clock className="h-3 w-3" /> {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                                     </div>
                                 </div>
                             )}
                         </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Zoom Kontrolleri */}
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.8, z - 0.1))} className="h-8 w-8 hover:bg-white text-slate-500 rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-400 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 hover:bg-white text-slate-500 rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>
                        
                        <Button variant="ghost" size="icon" onClick={() => window.print()} className="h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100"><Printer className="h-5 w-5"/></Button>
                        <Button variant="ghost" size="icon" onClick={() => {
                            navigator.share({ title: page.title, url: window.location.href }).catch(() => {});
                        }} className="h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100 sm:flex hidden"><Share2 className="h-5 w-5"/></Button>
                        
                        <Button 
                            onClick={toggleFullscreen} 
                            className={cn(
                                "h-11 px-5 rounded-xl font-bold gap-2 shadow-lg transition-all",
                                isFullscreen ? "bg-slate-900 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                            )}
                        >
                            {isFullscreen ? <><Minimize className="h-5 w-5" /> Çık</> : <><Maximize className="h-5 w-5" /> Tam Ekran</>}
                        </Button>
                    </div>
                </div>
            </div>

            {/* İçerik Alanı */}
            <div className={cn(
                "transition-all duration-500",
                isFullscreen ? "bg-white" : "container mx-auto"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    <CardContent className="p-0">
                        <div 
                            ref={contentRef}
                            style={{ 
                                zoom: zoomLevel,
                                fontSize: '1.1rem',
                                lineHeight: '1.7'
                            }}
                            className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:text-indigo-600 prose-img:rounded-3xl prose-img:shadow-2xl"
                            dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
