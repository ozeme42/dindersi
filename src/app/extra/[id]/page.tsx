'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Download, Plus, Minus, 
    Maximize, Minimize, Printer, Clock, FileText, 
    ChevronRight, Home, Layout, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1.1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

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
    }, [id]);

    // Script Runner: HTML içindeki scriptleri güvenli bir şekilde çalıştırır
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // go(-1) gibi fonksiyonlar için global uyumluluk katmanı
            (window as any).go = (n: number) => window.history.go(n);

            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // Script içeriğini IIFE (Anında Çalışan Fonksiyon) içine alıyoruz
                // Bu sayede 'identifier already declared' hatası engellenir
                const content = oldScript.textContent || "";
                
                // Fonksiyon tanımlarını yakalayıp window nesnesine bağlayan akıllı dönüştürücü
                // Örn: function showSection() -> window.showSection = function()
                const exportedContent = content.replace(
                    /function\s+([a-zA-Z0-9_]+)\s*\(/g, 
                    'window.$1 = function('
                );

                newScript.textContent = `(function() { 
                    try {
                        ${exportedContent}
                    } catch(e) { 
                        console.warn("Script execution error:", e); 
                    }
                })();`;
                
                document.body.appendChild(newScript);
                document.body.removeChild(newScript);
            });

            // Eğer sayfa yüklendiğinde çalışması gereken standart init fonksiyonları varsa
            setTimeout(() => {
                if (typeof (window as any).initAdimAdim === 'function') {
                    try { (window as any).initAdimAdim(); } catch(e) {}
                }
            }, 100);
        }
    }, [page?.htmlContent]);

    useEffect(() => {
        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            contentRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-6">
                <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xl text-center max-w-sm">
                    <p className="text-slate-600 font-bold mb-6 text-lg">Döküman bulunamadı veya kaldırılmış olabilir.</p>
                    <Button asChild className="w-full bg-slate-900 rounded-xl">
                        <Link href="/extra">Galeriye Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500",
            isFullscreen ? "bg-white p-0" : "bg-slate-50 p-4 md:p-8 pb-20"
        )}>
             <style jsx global>{`
                @media print {
                    .print-hide { display: none !important; }
                    body { background: white !important; }
                    .prose { max-width: 100% !important; padding: 0 !important; }
                }
            `}</style>

            {/* Üst Kontrol Barı */}
            <div className={cn(
                "print-hide mb-8 transition-all duration-300",
                isFullscreen ? "fixed top-4 left-4 right-4 z-50 opacity-0 hover:opacity-100 focus-within:opacity-100" : "container mx-auto"
            )}>
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200 p-3 rounded-2xl shadow-xl flex items-center justify-between gap-4">
                     <div className="flex items-center gap-3 min-w-0">
                         {!isFullscreen && (
                            <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                            </Button>
                         )}
                         <div className="min-w-0">
                            <h1 className="font-black text-slate-800 uppercase tracking-tight text-sm md:text-base truncate leading-none">
                                {page.title}
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter h-4 bg-indigo-50 border-indigo-100 text-indigo-600 px-1.5">
                                    {page.category || 'Genel'}
                                </Badge>
                            </div>
                         </div>
                     </div>

                     <div className="flex items-center gap-2">
                        {/* Zoom Kontrolleri */}
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg">
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-[10px] font-black text-slate-400 w-12 text-center uppercase tracking-tighter">
                                %{Math.round(zoomLevel * 100)}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

                        <Button onClick={handlePrint} variant="outline" size="icon" className="rounded-xl border-slate-200 text-slate-600 h-10 w-10">
                            <Printer className="h-4 w-4" />
                        </Button>

                        <Button onClick={toggleFullscreen} variant="default" size="icon" className="rounded-xl bg-slate-900 text-white h-10 w-10 shadow-lg active:scale-95 transition-transform">
                            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                     </div>
                </div>
            </div>

            {/* İçerik Kartı */}
            <main 
                ref={contentRef}
                className={cn(
                    "transition-all duration-500",
                    isFullscreen ? "bg-white" : "container mx-auto"
                )}
            >
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    <CardContent 
                        className="p-0"
                        style={{ 
                            zoom: isFullscreen ? zoomLevel : 1, 
                            transform: !isFullscreen ? `scale(${zoomLevel})` : 'none',
                            transformOrigin: 'top center'
                        }}
                    >
                        <div 
                            className="prose prose-slate max-w-none prose-headings:font-black prose-p:text-justify prose-img:rounded-3xl prose-a:text-indigo-600"
                            dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

function Minimize2(props: any) {
    return <Minimize {...props} />;
}