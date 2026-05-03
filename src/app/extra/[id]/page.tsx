
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, BookOpen, Plus, Minus, Maximize, 
    Minimize, Download, HelpCircle, History, Share2, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.1); // Varsayılan biraz daha büyük olsun
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchPage = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        const res = await getExtraPage(id);
        if (res.success && res.data) {
            setPage(res.data);
        } else {
            setError(res.error || "Döküman yüklenemedi.");
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => { fetchPage(); }, [fetchPage]);

    // --- KRİTİK: Güvenli Script Runner ---
    // HTML içindeki script etiketlerini ayıklar ve global kapsamda çalıştırır.
    // Identifier already declared hatalarını önlemek için kodları kapsüller.
    useEffect(() => {
        if (page?.htmlContent && containerRef.current) {
            const scripts = containerRef.current.querySelectorAll('script');
            
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // go(-1) gibi global fonksiyonlar için polyfill ekle
                const wrapper = `
                    (function() {
                        try {
                            // Global Uyumluluk Fonksiyonları
                            window.go = window.go || function(n) { window.history.go(n); };
                            
                            // Script İçeriği
                            ${oldScript.innerHTML}
                            
                            // Eğer bir init fonksiyonu varsa DOM hazır olduğunda çalıştır
                            if (typeof initAdimAdim === 'function') {
                                setTimeout(initAdimAdim, 100);
                            }
                        } catch (e) {
                            console.warn("Script execution error in döküman:", e);
                        }
                    })();
                `;
                
                newScript.innerHTML = wrapper;
                document.body.appendChild(newScript);
                // Temizlik için scripti kaldır (fonksiyonlar window'da kalır)
                document.body.removeChild(newScript);
            });
        }
    }, [page?.htmlContent]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">İçerik Hazırlanıyor</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white p-10 rounded-[3rem] border border-red-100 max-w-md w-full shadow-2xl">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <HelpCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Hata Oluştu</h2>
                    <p className="text-slate-500 mb-8 font-medium">{error || "İçerik bulunamadı."}</p>
                    <Button asChild size="lg" className="w-full bg-slate-900 hover:bg-slate-800 rounded-2xl h-14 text-lg font-bold">
                        <Link href="/extra">Dökümanlara Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative font-sans print:bg-white overflow-x-hidden">
            
            {/* Header - Yazdırmada Gizli */}
            <header className={cn(
                "sticky top-0 z-50 transition-all duration-300 print:hidden",
                isFullscreen 
                    ? "h-0 overflow-hidden opacity-0" 
                    : "bg-white/80 backdrop-blur-xl border-b border-slate-200 py-3 md:py-4 px-4 md:px-8 shadow-sm"
            )}>
                <div className="container mx-auto flex items-center justify-between gap-4">
                     <div className="flex items-center gap-4 min-w-0">
                         <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100 flex-shrink-0">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                         </Button>
                         <div className="min-w-0">
                             <h1 className="text-lg md:text-xl font-black text-slate-900 truncate leading-tight uppercase tracking-tight">
                                {page.title}
                             </h1>
                             <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase mt-0.5">
                                {page.category || 'Genel'}
                             </Badge>
                         </div>
                     </div>

                     <div className="flex items-center gap-2 flex-shrink-0">
                         <div className="hidden sm:flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 mr-2">
                             <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} className="h-8 w-8 hover:bg-white rounded-lg text-slate-500"><Minus className="h-4 w-4"/></Button>
                             <span className="text-[10px] font-black text-slate-400 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                             <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))} className="h-8 w-8 hover:bg-white rounded-lg text-slate-500"><Plus className="h-4 w-4"/></Button>
                         </div>

                         <Button variant="outline" size="icon" onClick={handlePrint} className="rounded-xl h-10 w-10 border-slate-200 text-slate-500 hover:text-indigo-600">
                             <Printer className="h-5 w-5" />
                         </Button>

                         <FullscreenToggle className="rounded-xl h-10 w-10 bg-slate-900 text-white hover:bg-black border-0 shadow-lg" />
                     </div>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-grow transition-all duration-500 ease-in-out relative z-10",
                isFullscreen ? "p-0" : "py-8 md:py-12 px-4"
            )}>
                <div className={cn(
                    "mx-auto transition-all duration-500",
                    isFullscreen ? "max-w-none w-full" : "max-w-5xl"
                )}>
                    <Card className={cn(
                        "w-full transition-all border-none bg-white",
                        isFullscreen 
                            ? "rounded-none shadow-none" 
                            : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[85vh] border border-slate-100"
                    )}>
                        <div 
                            ref={containerRef}
                            className="prose prose-slate max-w-none prose-img:rounded-3xl prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600"
                            style={{ 
                                zoom: zoomLevel,
                                transformOrigin: 'top center'
                            }}
                            dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                        />
                    </Card>
                </div>
            </main>

            {/* Yüzen Kontroller (Sadece Tam Ekranda Görünür) */}
            <div className={cn(
                "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 print:hidden",
                isFullscreen ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0 pointer-events-none"
            )}>
                <div className="flex items-center gap-3 p-3 bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} className="h-12 w-12 rounded-full text-white hover:bg-white/10">
                        <Minus className="h-6 w-6"/>
                    </Button>
                    <div className="w-px h-6 bg-white/20"></div>
                    <span className="text-xs font-black text-white/50 uppercase px-2">Boyut</span>
                    <div className="w-px h-6 bg-white/20"></div>
                    <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))} className="h-12 w-12 rounded-full text-white hover:bg-white/10">
                        <Plus className="h-6 w-6"/>
                    </Button>
                    <div className="w-px h-8 bg-white/20 mx-1"></div>
                    <Button 
                        onClick={() => document.exitFullscreen()} 
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> Çıkış
                    </Button>
                </div>
            </div>

            {/* Yazdırma Bilgi Altlığı */}
            <div className="hidden print:block fixed bottom-4 left-0 right-0 text-center text-[10px] text-slate-400 uppercase tracking-widest border-t pt-4">
                Din Dersi Atölyesi - {page.title} - {new Date().toLocaleDateString('tr-TR')}
            </div>
        </div>
    );
}

