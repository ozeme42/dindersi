'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, BookOpen, Plus, Minus, Download, 
    Maximize2, Minimize2, Clock, Globe, Share2, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fontSize, setFontSize] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const mainContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        const res = await getExtraPage(id);
        if (res.success) {
            setContent(res.data);
        } else {
            setError(res.error || "Sayfa yüklenirken hata oluştu.");
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Script Runner: HTML içindeki interaktif JS kodlarını React ortamında çalıştırır
    useEffect(() => {
        if (content?.htmlContent && !isLoading) {
            const timer = setTimeout(() => {
                const scripts = mainContentRef.current?.querySelectorAll('script');
                scripts?.forEach(oldScript => {
                    const newScript = document.createElement('script');
                    // Değişken çakışmalarını önlemek için IIFE (Anında Çalışan Fonksiyon) içine al
                    const code = `(function() { 
                        try { 
                            ${oldScript.innerHTML} 
                            // Global fonksiyonları window'a bağla (React uyumu için)
                            if (typeof initAdimAdim === 'function') window.initAdimAdim = initAdimAdim;
                            if (typeof showSection === 'function') window.showSection = showSection;
                        } catch(e) { 
                            console.error('Script Error:', e); 
                        } 
                    })();`;
                    newScript.innerHTML = code;
                    document.body.appendChild(newScript);
                    document.body.removeChild(newScript);
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [content, isLoading]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
                <Loader2 className="h-16 w-16 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Döküman Yükleniyor...</p>
            </div>
        );
    }

    if (error || !content) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center font-sans">
                <div className="bg-slate-900/50 p-12 rounded-[3rem] border border-red-500/20 max-w-md w-full backdrop-blur-xl shadow-2xl">
                    <div className="p-4 bg-red-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                        <Share2 className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 uppercase">İçerik Bulunamadı</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">{error || "Bu döküman yayından kaldırılmış veya silinmiş olabilir."}</p>
                    <Button asChild size="lg" className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl h-14">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5"/> Galeriye Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative font-sans selection:bg-indigo-100">
            {/* Arka Plan Efektleri */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[120px]" />
            </div>

            {/* Sticky Navigation Bar */}
            <header className={cn(
                "sticky top-0 z-50 transition-all duration-300",
                isFullscreen ? "h-0 p-0 overflow-hidden opacity-0" : "bg-white/80 backdrop-blur-xl border-b border-slate-200 h-20"
            )}>
                <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <Link href="/extra">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100 shrink-0">
                                <ArrowLeft className="h-5 w-5 text-slate-600" />
                            </Button>
                        </Link>
                        <div className="overflow-hidden">
                            <h1 className="text-xl font-black text-slate-900 truncate uppercase tracking-tight">{content.title}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-bold uppercase">{content.category}</Badge>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
                            <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.max(0.6, s - 0.1))} className="h-8 w-8 rounded-lg text-slate-500 hover:bg-white"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-400 w-12 text-center uppercase">Boyut</span>
                            <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.min(2.5, s + 0.1))} className="h-8 w-8 rounded-lg text-slate-500 hover:bg-white"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <Button variant="outline" size="icon" onClick={() => window.print()} className="rounded-xl border-slate-200 h-10 w-10 text-slate-600 hover:bg-slate-50">
                            <Printer className="h-5 w-5" />
                        </Button>
                        <FullscreenToggle elementRef={mainContentRef} className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-200 rounded-xl" />
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main 
                ref={mainContentRef}
                className={cn(
                    "flex-1 relative z-10 transition-all duration-500 overflow-y-auto",
                    isFullscreen ? "bg-white p-6 sm:p-12 md:p-20 h-screen" : "container mx-auto px-4 py-8 md:py-12"
                )}
                style={{ fontSize: `${fontSize}rem` }}
            >
                <div 
                    className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:leading-relaxed prose-img:rounded-3xl prose-img:shadow-2xl"
                    dangerouslySetInnerHTML={{ __html: content.htmlContent }}
                />

                {/* Floating Bottom Toolbar (Only when Fullscreen) */}
                <div className={cn(
                    "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
                    isFullscreen ? "translate-y-0 opacity-100" : "translate-y-32 opacity-0 pointer-events-none"
                )}>
                    <div className="flex items-center gap-2 p-2 rounded-full bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-md">
                        <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.max(0.6, s - 0.1))} className="h-12 w-12 rounded-full text-white hover:bg-white/10"><Minus className="h-6 w-6"/></Button>
                        <div className="w-px h-6 bg-white/20 mx-1" />
                        <span className="text-[10px] font-black text-slate-400 uppercase px-2">Yazı Boyutu</span>
                        <div className="w-px h-6 bg-white/20 mx-1" />
                        <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.min(2.5, s + 0.1))} className="h-12 w-12 rounded-full text-white hover:bg-white/10"><Plus className="h-6 w-6"/></Button>
                        <div className="w-px h-8 bg-white/20 mx-2" />
                        <FullscreenToggle elementRef={mainContentRef} className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-500 text-white border-0 shadow-lg" />
                    </div>
                </div>
            </main>

            {/* Back to top footer */}
            {!isFullscreen && (
                <footer className="container mx-auto px-4 py-12 border-t border-slate-200 mt-12 flex flex-col items-center gap-6 text-center">
                    <div className="p-4 bg-slate-100 rounded-3xl">
                        <Globe className="h-8 w-8 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Döküman Sonu</p>
                        <p className="text-slate-500 text-xs italic">Bu içerik platform üzerinden paylaşılmıştır.</p>
                    </div>
                    <Button asChild variant="ghost" className="rounded-xl text-indigo-600 font-bold">
                        <Link href="/extra">Daha Fazla İçerik Keşfet</Link>
                    </Button>
                </footer>
            )}
        </div>
    );
}
