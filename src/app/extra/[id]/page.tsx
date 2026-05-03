'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ArrowLeft, Maximize2, Minimize2, Settings2, Plus, Minus, 
    Download, Loader2, AlertTriangle, FileText, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

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

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Döküman yüklenemedi.");
            }
            setIsLoading(false);
        };
        if (id) fetchData();

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [id]);

    // Dinamik İçerik Yürütücü (Geliştirilmiş Script Runner)
    useEffect(() => {
        if (!isLoading && page?.htmlContent && contentRef.current) {
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Fonksiyonları global window nesnesine güvenli bir şekilde bağla
                const safeCode = `
                    (function() {
                        try {
                            ${oldScript.innerHTML}
                            // Döküman içindeki yaygın fonksiyonları dışarı aktar
                            if (typeof showSection !== 'undefined') window.showSection = showSection;
                            if (typeof toggleAccordion !== 'undefined') window.toggleAccordion = toggleAccordion;
                            if (typeof initAdimAdim !== 'undefined') window.initAdimAdim = initAdimAdim;
                            if (typeof changeTextSize !== 'undefined') window.changeTextSize = changeTextSize;
                        } catch (e) {
                            console.warn("Script Yürütme Hatası:", e);
                        }
                    })();
                `;
                newScript.innerHTML = safeCode;
                document.body.appendChild(newScript);
                // Temizlik için script'i kaldır (fonksiyonlar window'da kalır)
                setTimeout(() => document.body.removeChild(newScript), 100);
            });
        }
    }, [isLoading, page]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
        else document.exitFullscreen();
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !page) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-red-100 shadow-xl text-center">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Hata Oluştu</h2>
                    <p className="text-slate-500 mb-8">{error}</p>
                    <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 rounded-xl">
                        <Link href="/extra">Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen bg-white flex flex-col relative transition-all duration-500",
            isFullscreen ? "p-0" : "p-4 md:p-8"
        )}>
            {/* Navigasyon Çubuğu */}
            <div className={cn(
                "flex-shrink-0 flex items-center justify-between transition-all duration-300 border-b pb-4 mb-6",
                isFullscreen ? "absolute top-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-md opacity-0 hover:opacity-100" : "border-slate-100"
            )}>
                <div className="flex items-center gap-4">
                     {!isFullscreen && (
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-slate-100">
                            <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link>
                        </Button>
                     )}
                     <div className="min-w-0">
                         <h1 className="text-xl font-black text-slate-900 uppercase truncate tracking-tight">
                            {page.title}
                         </h1>
                         <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[10px] font-black uppercase mt-1">
                                {page.category || 'Genel'}
                            </Badge>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <Clock className="h-2.5 w-2.5" />
                                {page.updatedAt ? format(new Date(page.updatedAt), 'd MMMM yyyy', { locale: tr }) : '-'}
                            </span>
                         </div>
                     </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                    </div>
                    <Button variant="outline" onClick={toggleFullscreen} size="icon" className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* İçerik Alanı (Çerçevesiz/Direct DOM) */}
            <div className={cn(
                "flex-grow relative z-10 mx-auto w-full transition-all duration-300",
                isFullscreen ? "overflow-y-auto h-screen p-6 md:p-12" : "max-w-6xl"
            )}>
                <div 
                    ref={contentRef}
                    className="prose prose-slate max-w-none w-full"
                    style={{ 
                        transform: `scale(${zoomLevel})`, 
                        transformOrigin: 'top center',
                        fontSize: '1rem'
                    }}
                    dangerouslySetInnerHTML={{ __html: page.htmlContent }} 
                />
                <div className="h-40" /> {/* Alt boşluk */}
            </div>

            {/* Kayan Kapatma Butonu (Sadece Tam Ekranda) */}
            {isFullscreen && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10">
                    <Button 
                        onClick={() => document.exitFullscreen()}
                        className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30 shadow-2xl"
                    >
                        <Minimize2 className="mr-2 h-5 w-5" /> Çıkış
                    </Button>
                </div>
            )}
        </div>
    );
}
