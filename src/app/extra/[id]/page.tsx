'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Clock, Plus, Minus, Printer, FileText, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);

    // Dışarıdan gelen sunumu güvenli bir kapsüle (sandbox) alıyoruz.
    const iframeContent = useMemo(() => {
        if (!page?.htmlContent) return "";
        
        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    /* TAM EKRAN VE TAM GENİŞLİK AYARLARI BURADA */
                    html, body { 
                        width: 100%; 
                        height: 100%; 
                        margin: 0; 
                        padding: 0; 
                        font-family: system-ui, sans-serif; 
                        overflow-x: hidden; 
                    }
                    /* Özel kaydırma çubuğu */
                    ::-webkit-scrollbar { width: 8px; height: 8px; }
                    ::-webkit-scrollbar-track { background: #f1f1f1; }
                    ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
                    ::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
                </style>
                <script>
                    window.go = window.go || function(n) { history.go(n); };
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
                </script>
            </head>
            <body>
                ${page.htmlContent}
            </body>
            </html>
        `;
    }, [page]);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "İstediğiniz döküman bulunamadı veya henüz eklenmemiş.");
            }
            setIsLoading(false);
        };
        if (id) fetchPage();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [id]);

    if (isLoading) {
        return (
            <div className="h-[100dvh] w-full bg-white flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-slate-500 font-medium">İçerik Yükleniyor...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-[100dvh] w-full bg-white flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-white border border-red-100 p-10 rounded-3xl max-w-md shadow-xl w-full">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="h-8 w-8 text-red-400" />
                    </div>
                    <p className="text-slate-800 text-lg font-bold mb-2">Döküman Bulunamadı</p>
                    <p className="text-slate-500 text-sm mb-8">{error || "Hata Oluştu"}</p>
                    <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5" /> Dosyalara Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "w-full flex flex-col bg-white selection:bg-blue-100",
            isFullscreen ? "h-screen overflow-hidden" : "min-h-screen"
        )}>
            
            {/* Üst Araç Çubuğu - Tam ekranda gizlenir */}
            {!isFullscreen && (
                <header className="w-full z-50 transition-all duration-500 bg-white/95 backdrop-blur-md shrink-0 border-b border-slate-200">
                    <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden w-full md:w-auto">
                            <Button variant="ghost" size="icon" asChild className="rounded-xl flex-shrink-0 hover:bg-slate-100 transition-colors">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-700" /></Link>
                            </Button>
                            
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500 hidden sm:block flex-shrink-0" />
                                    <h1 className="font-bold tracking-tight text-slate-800 truncate text-base lg:text-lg">
                                        {page.title}
                                    </h1>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                    <span className="font-medium text-blue-600">{page.category ? page.category.split('/')[0] : 'Genel'}</span>
                                    {page.category && page.category.includes('/') && (
                                        <>
                                            <ChevronRight className="h-3 w-3 text-slate-400" />
                                            <span>{page.category.split('/')[1]}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="hidden sm:flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200 mr-2">
                                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md">
                                    <Minus className="h-4 w-4"/>
                                </Button>
                                <span className="text-xs font-semibold text-slate-600 w-12 text-center tabular-nums">{Math.round(zoomLevel * 100)}%</span>
                                <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md">
                                    <Plus className="h-4 w-4"/>
                                </Button>
                            </div>

                            <Button 
                                variant="outline" 
                                onClick={() => window.print()} 
                                className="hidden md:flex h-10 items-center gap-2 rounded-xl bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                                <Printer className="h-4 w-4" /> Yazdır
                            </Button>

                            <FullscreenToggle elementRef={containerRef} className="bg-white border-slate-200 text-slate-600 h-10 w-10 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors" />
                        </div>
                    </div>
                </header>
            )}

            {/* İÇERİK ALANI - TAM ALAN KULLANIMI (ABSOLUTE INSET-0) */}
            <main className="flex-grow w-full relative bg-[#f8f9fa] block">
                <div 
                    className="absolute inset-0 w-full h-full transition-transform duration-200 ease-out block"
                    style={{ 
                        transform: `scale(${zoomLevel})`, 
                        transformOrigin: 'top center' 
                    }}
                >
                    <iframe
                        srcDoc={iframeContent}
                        title={page.title}
                        className="w-full h-full border-none bg-transparent block"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                    />
                </div>
            </main>
                
            {/* Alt Bilgi Alanı - Tam ekranda gizlenir */}
            {!isFullscreen && (
                <footer className="w-full px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white z-10 mt-auto">
                    <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">
                            Son Güncelleme: {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy HH:mm', { locale: tr }) : '-'}
                        </span>
                    </div>
                    <div className="text-xs text-slate-400">
                        Döküman ID: <span className="font-mono text-slate-500">{page.id.substring(0, 8)}...</span>
                    </div>
                </footer>
            )}
        </div>
    );
}