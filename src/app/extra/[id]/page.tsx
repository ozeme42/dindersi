'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Plus, Minus, Share2, Download, Printer, Home, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Veri Çekme
    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa yüklenemedi.");
            }
            setIsLoading(false);
        };
        fetchData();
    }, [id]);

    // Script Runner: Döküman içerisindeki inline fonksiyonları (showSection, toggleAccordion, changeTextSize vb.) global kapsama bağlar.
    useEffect(() => {
        if (!page?.htmlContent) return;

        // Global fonksiyon tanımları
        (window as any).showSection = (sectionId: string) => {
            const sections = document.querySelectorAll('.page-section');
            sections.forEach(s => (s as HTMLElement).classList.add('hidden'));
            const target = document.getElementById(sectionId);
            if (target) target.classList.remove('hidden');
        };

        (window as any).toggleAccordion = (id: string) => {
            const content = document.getElementById(id);
            if (content) {
                const isHidden = content.classList.contains('hidden');
                content.classList.toggle('hidden');
                const btn = content.previousElementSibling;
                if (btn) {
                    const icon = btn.querySelector('.chevron-icon');
                    if (icon) icon.classList.toggle('rotate-180', !isHidden);
                }
            }
        };

        (window as any).changeTextSize = (delta: number) => {
            setZoom(prev => Math.min(2.5, Math.max(0.8, prev + delta)));
        };

        (window as any).go = (dir: number) => {
            if (dir === -1) router.back();
            else if (dir === 1) window.history.forward();
        };

        // Döküman içindeki <script> taglerini bul ve güvenli şekilde çalıştır
        const timer = setTimeout(() => {
            const scripts = contentRef.current?.querySelectorAll('script');
            scripts?.forEach(script => {
                try {
                    const newScript = document.createElement('script');
                    newScript.textContent = script.textContent;
                    document.body.appendChild(newScript);
                    document.body.removeChild(newScript);
                } catch (e) {
                    console.error("Döküman script hatası:", e);
                }
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            // Cleanup: Global fonksiyonları temizleme (isteğe bağlı)
        };
    }, [page, router]);

    // Fullscreen İzleme
    useEffect(() => {
        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">İçerik Hazırlanıyor...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                <Card className="bg-slate-900 border-red-500/20 p-8 rounded-[2.5rem] max-w-md shadow-2xl">
                    <p className="text-red-400 font-bold text-xl mb-6">{error || "Döküman bulunamadı."}</p>
                    <Button asChild className="bg-white/10 hover:bg-white/20 text-white w-full rounded-2xl h-14">
                        <Link href="/extra">Galeriye Dön</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen transition-colors duration-500 flex flex-col",
            isFullscreen ? "bg-white overflow-hidden" : "bg-slate-50"
        )}>
            {/* Navigasyon Barı */}
            {!isFullscreen && (
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                         <div className="flex items-center gap-4 min-w-0">
                            <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link>
                            </Button>
                            <div className="min-w-0">
                                <h1 className="text-lg font-black text-slate-900 truncate uppercase tracking-tight leading-none">
                                    {page.title}
                                </h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase px-2 h-4">
                                        {page.category || 'Genel'}
                                    </Badge>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" />
                                        {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                                    </span>
                                </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-2">
                            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                                <Button variant="ghost" size="icon" onClick={() => (window as any).changeTextSize(-0.1)} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                                <span className="text-[10px] font-black text-slate-400 w-12 text-center uppercase">Boyut</span>
                                <Button variant="ghost" size="icon" onClick={() => (window as any).changeTextSize(0.1)} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                            </div>
                            <Button onClick={toggleFullscreen} variant="outline" size="icon" className="rounded-xl h-10 w-10 border-slate-200 text-slate-600">
                                <Maximize2 className="h-5 w-5" />
                            </Button>
                         </div>
                    </div>
                </header>
            )}

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-grow flex flex-col",
                isFullscreen ? "h-screen" : "py-8"
            )}>
                <div className={cn(
                    "flex-grow flex flex-col",
                    isFullscreen ? "bg-white" : "container mx-auto"
                )}>
                    <Card className={cn(
                        "w-full transition-all border-none bg-white",
                        isFullscreen ? "rounded-none h-full shadow-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh] border border-slate-200"
                    )}>
                        <div 
                            ref={contentRef}
                            style={{ zoom }}
                            className="prose prose-slate max-w-none w-full animate-in fade-in duration-700"
                            dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                        />
                    </Card>
                </div>
            </main>

            {/* Floating Zoom Controls (Fullscreen modunda görünür) */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500",
                isFullscreen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20 pointer-events-none"
            )}>
                <div className="flex items-center gap-3 p-2 bg-slate-900/90 backdrop-blur-xl rounded-full border border-white/20 shadow-2xl">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => (window as any).changeTextSize(-0.1)} 
                        className="h-12 w-12 rounded-full text-white hover:bg-white/10"
                    >
                        <Minus className="h-6 w-6" />
                    </Button>
                    <div className="w-px h-8 bg-white/20 mx-1" />
                    <span className="text-xs font-black text-white px-2 tracking-widest uppercase">Boyut</span>
                    <div className="w-px h-8 bg-white/20 mx-1" />
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => (window as any).changeTextSize(0.1)} 
                        className="h-12 w-12 rounded-full text-white hover:bg-white/10"
                    >
                        <Plus className="h-6 w-6" />
                    </Button>
                    <div className="w-px h-10 bg-white/40 mx-2" />
                    <Button 
                        onClick={toggleFullscreen}
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> Çıkış
                    </Button>
                </div>
            </div>
        </div>
    );
}
