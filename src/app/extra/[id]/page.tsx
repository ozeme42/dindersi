
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Download, Plus, Minus, Globe, Clock, Tag, Home, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoom, setZoom] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Döküman içindeki scriptleri güvenli bir şekilde çalıştıran mekanizma
    const executeInlineScripts = useCallback((content: string) => {
        if (!content) return;
        
        // Önce mevcut döküman scriptlerini temizle (varsa)
        const existing = document.querySelectorAll('.extra-page-dynamic-script');
        existing.forEach(el => el.remove());

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const scripts = doc.querySelectorAll('script');

        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            newScript.className = 'extra-page-dynamic-script';
            
            // Script içeriğindeki 'let' ve 'const' tanımlarını 'var' ile değiştirerek 
            // 'Identifier already declared' SyntaxError hatasını engelliyoruz.
            let scriptCode = oldScript.textContent || "";
            scriptCode = scriptCode.replace(/\blet\s+/g, 'var ').replace(/\bconst\s+/g, 'var ');
            
            // Fonksiyonları ve değişkenleri window nesnesine bağlayarak global erişilebilir kılıyoruz
            newScript.textContent = `
                (function() {
                    ${scriptCode}
                    
                    // Yaygın fonksiyonları global'e çıkar (showSection, toggleAccordion, initCategoryMenu vb.)
                    const globalFuncs = ['showSection', 'toggleAccordion', 'initCategoryMenu', 'initAdimAdim', 'go'];
                    globalFuncs.forEach(funcName => {
                        if (typeof eval(funcName) === 'function') {
                            window[funcName] = eval(funcName);
                        }
                    });

                    // go(-1) gibi navigasyonları destekle
                    window.go = function(val) {
                        if(val === -1) window.history.back();
                    };
                })();
            `;
            
            document.body.appendChild(newScript);
        });
    }, []);

    useEffect(() => {
        const fetchPage = async () => {
            if (!params.id) return;
            const res = await getExtraPage(params.id as string);
            if (res.success) {
                setPage(res.data);
                // Scriptleri döküman render edildikten kısa bir süre sonra çalıştır
                setTimeout(() => executeInlineScripts(res.data.htmlContent), 100);
            }
            setIsLoading(false);
        };
        fetchPage();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => {
            document.removeEventListener('fullscreenchange', handleFs);
            // Sayfadan çıkarken global'e eklediğimiz fonksiyonları temizle
            const funcs = ['showSection', 'toggleAccordion', 'initCategoryMenu', 'initAdimAdim', 'go'];
            funcs.forEach(f => { if(window[f as any]) delete (window as any)[f]; });
        };
    }, [params.id, executeInlineScripts]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (!page) {
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
                <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-white/10 shadow-2xl max-w-md w-full">
                    <h2 className="text-red-400 text-2xl font-black uppercase mb-4">Döküman Bulunamadı</h2>
                    <p className="text-slate-400 mb-8">İstediğiniz içerik silinmiş veya taşınmış olabilir.</p>
                    <Button asChild className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold rounded-2xl shadow-lg">
                        <Link href="/extra">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen bg-white text-slate-900 flex flex-col relative transition-colors duration-500",
            isFullscreen ? "h-screen" : "p-4 md:p-6 bg-slate-50"
        )}>
            {/* Üst Bar */}
            <header className={cn(
                "flex-shrink-0 z-30 transition-all duration-300",
                isFullscreen 
                    ? "absolute top-4 left-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 opacity-0 hover:opacity-100 shadow-xl" 
                    : "mb-6 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4"
            )}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    {!isFullscreen && (
                         <Button variant="ghost" size="icon" asChild className="rounded-full h-11 w-11 hover:bg-slate-100 flex-shrink-0">
                            <Link href="/extra"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
                        </Button>
                    )}
                     <div className="min-w-0">
                         <h1 className={cn("font-black tracking-tight text-slate-900 uppercase truncate", isFullscreen ? "text-base" : "text-xl md:text-2xl")}>
                            {page.title}
                         </h1>
                         {!isFullscreen && (
                             <div className="flex items-center gap-3 mt-1">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase">{page.category || 'Genel'}</Badge>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                                </span>
                             </div>
                         )}
                     </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Zoom Kontrolü */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg">
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-[10px] font-black text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button onClick={toggleFullscreen} variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                        {isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}
                    </Button>
                </div>
            </header>

            {/* İçerik Alanı (Çerçevesiz - Doğrudan DOM) */}
            <div className={cn(
                "flex-grow overflow-y-auto relative z-10 transition-all duration-300",
                !isFullscreen && "bg-white rounded-[2.5rem] shadow-2xl border-4 border-white ring-1 ring-slate-200/50"
            )}>
                <div 
                    className="w-full h-auto p-6 md:p-10 mx-auto transition-transform origin-top"
                    style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
                    dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                />

                {/* Floating Exit for Fullscreen */}
                <div className={cn(
                    "fixed bottom-8 right-8 z-[100] transition-opacity duration-300",
                    isFullscreen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                    <Button 
                        onClick={() => document.exitFullscreen()}
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30 shadow-2xl"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> Çıkış
                    </Button>
                </div>
            </div>
        </div>
    );
}
