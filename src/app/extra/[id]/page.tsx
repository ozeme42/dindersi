'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Clock, Maximize2, Minimize2, 
    Plus, Minus, Globe, FileText, Home
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
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1.0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Döküman içindeki inline scriptleri güvenli bir şekilde yürüten yardımcı fonksiyon
    const executeInlineScripts = useCallback(() => {
        if (!contentRef.current) return;
        
        const scripts = contentRef.current.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            
            // let/const çakışmalarını (Identifier already declared) önlemek için var ile değiştiriyoruz
            let scriptText = oldScript.innerText;
            scriptText = scriptText
                .replace(/let\s+([a-zA-Z0-9_$]+)/g, 'var $1')
                .replace(/const\s+([a-zA-Z0-9_$]+)/g, 'var $1');
            
            // Dökümanlarda sık kullanılan navigasyon ve UI fonksiyonlarını global kapsama bağlıyoruz
            const helperFunctions = `
                window.go = window.go || function(n) { history.go(n); };
                window.showSection = window.showSection || function(id) {
                    const sections = document.querySelectorAll('.page-section');
                    sections.forEach(s => s.style.display = 'none');
                    const target = document.getElementById(id);
                    if(target) target.style.display = 'block';
                };
                window.toggleAccordion = window.toggleAccordion || function(id) {
                    const el = document.getElementById(id);
                    if(el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                };
            `;
            
            newScript.textContent = `(function() { ${helperFunctions} ${scriptText} })();`;
            document.body.appendChild(newScript);
        });
    }, []);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
                // DOM'un hazır olduğundan emin olmak için kısa bir gecikme ile scriptleri çalıştırıyoruz
                setTimeout(executeInlineScripts, 150);
            } else {
                setError(res.error || "İstediğiniz döküman bulunamadı veya henüz eklenmemiş.");
            }
            setIsLoading(false);
        };
        if (id) fetchPage();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [id, executeInlineScripts]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">İçerik Yükleniyor</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-900 border border-red-500/20 p-10 rounded-[3rem] max-w-md shadow-2xl backdrop-blur-xl">
                    <p className="text-red-400 text-xl font-black uppercase tracking-tight mb-8">{error || "Hata Oluştu"}</p>
                    <Button asChild size="lg" className="w-full h-14 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-2xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-5 w-5" /> Dökümanlara Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen flex flex-col bg-slate-50 transition-colors duration-500 selection:bg-indigo-100",
            isFullscreen && "bg-white"
        )}>
            {/* Üst Araç Çubuğu */}
            <header className={cn(
                "sticky top-0 z-50 transition-all duration-500",
                isFullscreen 
                    ? "opacity-0 hover:opacity-100 bg-white/95 backdrop-blur-md border-b border-slate-200" 
                    : "bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
            )}>
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4 overflow-hidden">
                        {!isFullscreen && (
                             <Button variant="ghost" size="icon" asChild className="rounded-full flex-shrink-0 hover:bg-slate-100">
                                <Link href="/extra"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
                            </Button>
                        )}
                        <div className="flex flex-col min-w-0">
                             <h1 className={cn(
                                 "font-black tracking-tight text-slate-900 uppercase truncate leading-none",
                                 isFullscreen ? "text-base" : "text-xl"
                             )}>
                                {page.title}
                             </h1>
                             {!isFullscreen && (
                                <Badge variant="outline" className="w-fit bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase mt-1 tracking-widest h-4 px-2">
                                    {page.category || 'Genel'}
                                </Badge>
                             )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Yakınlaştırma Kontrolleri */}
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 hover:bg-white text-slate-400 hover:text-slate-900 rounded-lg">
                                <Minus className="h-4 w-4"/>
                            </Button>
                            <span className="text-[10px] font-black text-slate-500 w-12 text-center tabular-nums">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 hover:bg-white text-slate-400 hover:text-slate-900 rounded-lg">
                                <Plus className="h-4 w-4"/>
                            </Button>
                        </div>

                        <FullscreenToggle elementRef={containerRef} className="bg-slate-100 border-slate-200 text-slate-600 h-10 w-10 rounded-xl shadow-sm hover:bg-white transition-all" />
                        
                        {!isFullscreen && (
                             <Button variant="ghost" size="icon" asChild className="h-10 w-10 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100">
                                <Link href="/"><Home className="h-5 w-5" /></Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-grow relative overflow-y-auto custom-scrollbar",
                !isFullscreen && "p-4 md:p-10"
            )}>
                 {!isFullscreen && (
                    <div className="fixed inset-0 pointer-events-none z-0">
                        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-100/30 rounded-full blur-[120px]" />
                        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-100/30 rounded-full blur-[120px]" />
                    </div>
                )}

                <div className={cn(
                    "mx-auto w-full transition-all duration-500 bg-white relative z-10",
                    isFullscreen ? "max-w-none min-h-screen" : "max-w-5xl rounded-[3rem] shadow-2xl border-4 border-white ring-1 ring-slate-200"
                )}>
                    {/* Rendered HTML İçeriği */}
                    <div 
                        ref={contentRef}
                        className="prose prose-slate max-w-none p-6 md:p-16 min-h-[70vh] prose-headings:font-black prose-headings:uppercase prose-p:text-justify prose-img:rounded-3xl prose-img:shadow-xl"
                        style={{ 
                            zoom: zoomLevel,
                            transformOrigin: 'top center'
                        }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                    
                    {/* Alt Bilgi Alanı */}
                    {!isFullscreen && (
                        <div className="px-10 py-10 border-t border-slate-50 bg-slate-50/50 rounded-b-[3rem] flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3.5 bg-white rounded-[1.25rem] shadow-sm border border-slate-100 text-indigo-600 group-hover:scale-110 transition-transform">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5">Güncelleme Tarihi</p>
                                    <p className="text-base font-black text-slate-700">
                                        {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy HH:mm', { locale: tr }) : '-'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => window.print()} className="rounded-2xl h-12 px-6 border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 font-bold gap-2 transition-all">
                                    <Globe className="h-5 w-5" /> Yazdır / PDF Al
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Tam Ekranda Yüzen Kapatma Butonu */}
            {isFullscreen && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/80 backdrop-blur-xl p-2 px-6 rounded-full border border-white/10 shadow-2xl group animate-in slide-in-from-bottom-10">
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mr-4 select-none">Tam Ekran Modu</span>
                    <Button 
                        onClick={() => document.exitFullscreen()}
                        className="h-11 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg border border-red-400/30"
                    >
                        <Minimize2 className="mr-2 h-4 w-4" /> Çıkış
                    </Button>
                </div>
            )}
        </div>
    );
}
