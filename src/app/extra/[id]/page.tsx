
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Plus, Minus, Maximize, Minimize, Printer, FileText, ChevronRight, LayoutDashboard, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const fetchContent = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const res = await getExtraPage(id);
            if (res.success) {
                setContent(res.data);
            } else {
                setError(res.error || "İçerik yüklenemedi.");
            }
        } catch (e) {
            setError("Sunucu hatası.");
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchContent(); }, [fetchContent]);

    // Döküman içindeki scriptleri güvenli bir şekilde çalıştır (initAdimAdim, showSection fix)
    useEffect(() => {
        if (content?.htmlContent && contentRef.current) {
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Script içeriğini IIFE (Anında çalışan fonksiyon) içine alıyoruz ki 
                // "Identifier has already been declared" (SyntaxError) hatası oluşmasın.
                newScript.textContent = `(function(){ ${oldScript.textContent} })();`;
                
                // Eğer script içindeki fonksiyonlara (window.showSection gibi) dışarıdan erişilecekse 
                // script içinde "window.funcName = ..." şeklinde tanımlanmış olmalı.
                // React bu scriptleri çalıştırır ama window scope'una yazar.
                document.body.appendChild(newScript);
                setTimeout(() => document.body.removeChild(newScript), 100);
            });
        }
    }, [content]);

    if (isLoading) return <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /><p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Döküman Hazırlanıyor</p></div>;

    if (error || !content) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="bg-white p-10 rounded-[3rem] border border-red-100 shadow-2xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase mb-2">Hata Oluştu</h2>
                    <p className="text-slate-500 mb-8 font-medium">{error || "Döküman bulunamadı."}</p>
                    <Button asChild className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-lg font-bold">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn("min-h-screen bg-slate-50 flex flex-col relative transition-all duration-500", isFullscreen ? "bg-white" : "")}>
            
            {/* Üst Kontrol Çubuğu */}
            <header className={cn(
                "sticky top-0 z-50 transition-all duration-500",
                isFullscreen ? "bg-white/95 backdrop-blur shadow-sm p-2" : "bg-white/80 backdrop-blur-xl border-b border-slate-200 p-4 md:p-6"
            )}>
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Link href="/extra">
                            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-slate-100 hover:bg-indigo-100 text-indigo-600">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight leading-none">{content.title}</h1>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-black uppercase px-2">{content.category || 'Genel'}</Badge>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        <Button variant="outline" size="icon" onClick={() => window.print()} className="h-11 w-11 rounded-xl bg-white border-slate-200 text-slate-600 hover:text-indigo-600 shadow-sm print:hidden">
                            <Printer className="h-5 w-5" />
                        </Button>
                        <FullscreenToggle elementRef={containerRef} className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-200" />
                    </div>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-1 container mx-auto p-4 md:p-10 transition-all duration-500",
                isFullscreen ? "max-w-6xl" : "max-w-5xl"
            )}>
                <div 
                    ref={contentRef}
                    className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-img:rounded-3xl prose-img:shadow-2xl"
                    style={{ 
                        zoom: zoomLevel, 
                        transformOrigin: 'top center',
                        fontSize: '1.125rem' 
                    }}
                    dangerouslySetInnerHTML={{ __html: content.htmlContent }}
                />
            </main>

            {/* Float Geri Dön (Sadece tam ekranda altta görünür) */}
            {isFullscreen && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
                    <Button onClick={() => setIsFullscreen(false)} className="bg-slate-900/80 hover:bg-slate-900 text-white rounded-full px-8 h-12 shadow-2xl backdrop-blur-md border border-white/10 font-bold uppercase tracking-widest">
                        Tam Ekrandan Çık
                    </Button>
                </div>
            )}
        </div>
    );
}

