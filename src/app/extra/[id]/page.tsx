'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Clock, Plus, Minus, Printer, FileText, 
    Maximize2, Minimize2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // GÜVENLİ SCRİPT YÜRÜTÜCÜ: HTML içindeki scriptleri React ortamında çalıştırır.
    const executeInlineScripts = useCallback((containerElement: HTMLElement) => {
        const scripts = containerElement.querySelectorAll('script');
        scripts.forEach((oldScript) => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            
            // Script içindeki let/const tanımları SyntaxError (already declared) yaratmasın diye var ile değiştiriyoruz.
            let inlineCode = oldScript.innerHTML;
            inlineCode = inlineCode.replace(/(?:let|const)\s+/g, 'var ');
            
            // Yaygın kullanılan fonksiyonları global kapsama (window) bağla
            const wrappedCode = `
                (function() {
                    window.showSection = window.showSection || function(id) {
                        const sections = document.querySelectorAll('.page-section');
                        sections.forEach(s => s.style.display = 'none');
                        const target = document.getElementById(id);
                        if(target) target.style.display = 'block';
                        window.scrollTo(0,0);
                    };
                    window.toggleAccordion = window.toggleAccordion || function(id) {
                        const el = document.getElementById(id);
                        if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                    };
                    window.changeTextSize = window.changeTextSize || function(delta) {
                        const content = document.getElementById('content-area') || document.body;
                        if (content) {
                            let currentSize = parseFloat(window.getComputedStyle(content).fontSize);
                            content.style.fontSize = (currentSize + delta) + 'px';
                        }
                    };
                    window.go = window.go || function(n) { 
                        if (typeof n === 'number') history.go(n);
                        else window.location.href = n;
                    };
                    
                    try {
                        ${inlineCode}
                    } catch(e) {
                        console.error("Döküman script hatası:", e);
                    }
                })();
            `;
            
            newScript.innerHTML = wrappedCode;
            document.body.appendChild(newScript);
        });
    }, []);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
                // Eğer bu bir link ise otomatik yönlendir
                if (res.data?.htmlContent?.startsWith('URL::')) {
                    window.location.href = res.data.htmlContent.replace('URL::', '');
                    return;
                }
            } else {
                setError(res.error || "Döküman bulunamadı.");
            }
            setIsLoading(false);
        };
        if (id) fetchPage();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [id]);

    // İçerik yüklendiğinde scriptleri çalıştır
    useEffect(() => {
        if (!isLoading && page && contentRef.current) {
            executeInlineScripts(contentRef.current);
        }
    }, [isLoading, page, executeInlineScripts]);

    if (isLoading) {
        return (
            <div className="h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs animate-pulse">Yükleniyor...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-[100dvh] w-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-900 border border-white/10 p-10 rounded-3xl max-w-md shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                        <FileText className="h-8 w-8" />
                    </div>
                    <p className="text-white text-lg font-bold mb-2">Hata Oluştu</p>
                    <p className="text-slate-400 text-sm mb-8">{error || "Döküman okunamadı."}</p>
                    <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "w-full flex flex-col bg-white transition-all duration-300",
            isFullscreen ? "h-screen overflow-hidden" : "min-h-screen"
        )}>
            {/* Üst Araç Çubuğu */}
            {!isFullscreen && (
                <header className="w-full z-50 bg-white/95 backdrop-blur-md shrink-0 border-b border-slate-200">
                    <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <Button variant="ghost" size="icon" asChild className="rounded-xl hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-700" /></Link>
                            </Button>
                            
                            <div className="flex flex-col min-w-0">
                                <h1 className="font-bold tracking-tight text-slate-800 truncate text-base lg:text-lg">
                                    {page.title}
                                </h1>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase">
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
                            <div className="hidden sm:flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-500 hover:bg-white"><Minus className="h-4 w-4"/></Button>
                                <span className="text-xs font-semibold text-slate-600 w-12 text-center tabular-nums">{Math.round(zoomLevel * 100)}%</span>
                                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-500 hover:bg-white"><Plus className="h-4 w-4"/></Button>
                            </div>

                            <Button variant="outline" onClick={() => window.print()} className="hidden md:flex h-10 items-center gap-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600">
                                <Printer className="h-4 w-4" /> Yazdır
                            </Button>

                            <FullscreenToggle elementRef={containerRef} className="bg-white border-slate-200 text-slate-600 h-10 w-10 rounded-xl hover:bg-blue-50" />
                        </div>
                    </div>
                </header>
            )}

            {/* İÇERİK ALANI - FRAMELESS (DOĞRUDAN DOM) */}
            <main className="flex-grow w-full relative bg-white block overflow-y-auto custom-scrollbar">
                <div 
                    ref={contentRef}
                    className="w-full h-full transition-transform duration-200 ease-out origin-top p-4 md:p-10"
                    style={{ transform: `scale(${zoomLevel})` }}
                    dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                />
            </main>
                
            {/* Alt Bilgi Alanı */}
            {!isFullscreen && (
                <footer className="w-full px-6 py-3 border-t border-slate-100 flex items-center justify-center shrink-0 bg-white">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                        dindersiatolyesi.com döküman merkezi
                    </p>
                </footer>
            )}

            {/* Tam Ekrandan Çıkış Butonu (Mobil/Akıllı Tahta İçin) */}
            {isFullscreen && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-4">
                    <Button 
                        size="lg" 
                        onClick={() => document.exitFullscreen()} 
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> Çıkış
                    </Button>
                </div>
            )}
        </div>
    );
}