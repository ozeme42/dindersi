
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, BookOpen, Plus, Minus, 
    Maximize, Minimize, Download, Settings, Printer 
} from 'lucide-react';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Veri Çekme
    useEffect(() => {
        if (!id) return;
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa yüklenemedi.");
            }
            setIsLoading(false);
        };
        fetchPage();
    }, [id]);

    // Script Runner: İçerikteki script'leri güvenli bir şekilde çalıştırır
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // HTML içindeki script etiketlerini bul
            const scripts = contentRef.current.querySelectorAll('script');
            
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // --- KRİTİK DÜZELTME: Script içeriğini IIFE içine alıyoruz ki çakışma olmasın ---
                // Ayrıca interaktif fonksiyonları global window nesnesine bağlıyoruz.
                const scriptBody = `
                    (function() {
                        try {
                            // go(-1) gibi navigasyonlar için global bir go fonksiyonu tanımla
                            if (typeof window.go !== 'function') {
                                window.go = function(val) { 
                                    if (val === -1) window.history.back(); 
                                };
                            }

                            ${oldScript.innerText}

                            // Önemli fonksiyonları window'a taşı
                            if (typeof showSection === 'function') window.showSection = showSection;
                            if (typeof initAdimAdim === 'function') window.initAdimAdim = initAdimAdim;
                            if (typeof setPage === 'function') window.setPage = setPage;
                            if (typeof nextAdim === 'function') window.nextAdim = nextAdim;
                            
                        } catch (e) {
                            console.error("Döküman Script Hatası:", e);
                        }
                    })();
                `;
                
                newScript.text = scriptBody;
                document.body.appendChild(newScript);
                
                // Temizlik: Script çalıştıktan sonra DOM'dan kaldır (fonksiyonlar window'da kalır)
                setTimeout(() => {
                    if (document.body.contains(newScript)) {
                        document.body.removeChild(newScript);
                    }
                }, 100);
            });

            // Eğer sayfa yüklendiğinde çalışması gereken bir init fonksiyonu varsa kısa bir gecikmeyle çalıştır
            setTimeout(() => {
                try {
                    if (typeof (window as any).initAdimAdim === 'function') {
                        (window as any).initAdimAdim();
                    }
                } catch (e) {
                    console.warn("Otomatik başlatma hatası:", e);
                }
            }, 200);
        }
    }, [page?.htmlContent]);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    const handlePrint = () => window.print();

    if (isLoading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-xs">İçerik Hazırlanıyor...</p>
        </div>
    );

    if (error || !page) return (
        <div className="h-screen w-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="max-w-md w-full text-center bg-white p-10 rounded-[3rem] shadow-xl border border-red-100">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                    <BookOpen className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">İçerik Bulunamadı</h2>
                <p className="text-slate-500 mb-8">{error || "Aradığınız döküman sistemde mevcut değil."}</p>
                <Button asChild className="w-full h-12 bg-slate-900 text-white rounded-xl">
                    <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                </Button>
            </div>
        </div>
    );

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen transition-colors duration-500 flex flex-col",
            isFullscreen ? "bg-white" : "bg-slate-50"
        )}>
            {/* Navigasyon Barı */}
            <div className={cn(
                "sticky top-0 z-[100] transition-all border-b print:hidden",
                isFullscreen 
                    ? "bg-white/80 backdrop-blur-md border-slate-100 px-4 py-2" 
                    : "bg-white/60 backdrop-blur-xl border-slate-200 p-4"
            )}>
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                         {!isFullscreen && (
                            <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5" /></Link>
                            </Button>
                         )}
                         <div className="min-w-0">
                            <h1 className="font-black text-slate-800 text-lg uppercase truncate leading-none">
                                {page.title}
                            </h1>
                            {!isFullscreen && <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-1">{page.category || 'Döküman'}</p>}
                         </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Zoom Kontrolü */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))} className="h-8 w-8 hover:bg-white rounded-lg text-slate-600"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-500 w-14 text-center select-none">% {Math.round(zoomLevel * 100)}</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.1))} className="h-8 w-8 hover:bg-white rounded-lg text-slate-600"><Plus className="h-4 w-4"/></Button>
                        </div>

                        <Button variant="outline" size="icon" onClick={handlePrint} className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100" title="Yazdır">
                            <Printer className="h-5 w-5" />
                        </Button>
                        
                        <FullscreenToggle elementRef={containerRef} className="h-10 w-10 bg-slate-900 text-white rounded-xl shadow-lg border-0" />
                    </div>
                </div>
            </div>

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-grow relative z-10 py-6 md:py-12 px-4 print:p-0",
                isFullscreen ? "bg-white" : "container mx-auto"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white print:shadow-none",
                    isFullscreen ? "rounded-none shadow-none" : "rounded-[3rem] shadow-2xl p-6 md:p-12 min-h-[85vh] border border-slate-100"
                )}>
                    <article 
                        ref={contentRef}
                        className="prose prose-slate max-w-none prose-headings:font-black prose-p:text-justify"
                        style={{ zoom: zoomLevel }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </Card>
            </main>
            
            {/* Baskı Bilgisi */}
            <footer className="hidden print:block text-center text-[10px] text-slate-400 py-10 border-t mt-10">
                Bu döküman Değerler Oyunu platformu üzerinden oluşturulmuştur. &bull; {new Date().toLocaleDateString('tr-TR')}
            </footer>
        </div>
    );
}
