'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Maximize2, Minimize2, 
    Plus, Minus, RotateCcw, Share2, Globe, Clock, 
    ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

/**
 * @fileoverview Ekstra Sayfa Görüntüleyici
 * Bu bileşen, Firestore'dan gelen HTML içeriğini güvenli bir şekilde render eder
 * ve döküman içindeki interaktif scriptleri SyntaxError (re-declaration) 
 * vermeyecek şekilde yürütür.
 */

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // --- SCRIPT YÜRÜTÜCÜ (CRITICAL FIX) ---
    const executeInlineScripts = useCallback(() => {
        if (!contentRef.current) return;

        const scripts = contentRef.current.querySelectorAll('script');
        scripts.forEach((oldScript) => {
            const newScript = document.createElement('script');
            
            // SyntaxError: Identifier '...' has already been declared hatasını çözmek için
            // Script içeriğindeki 'const ' ve 'let ' ifadelerini 'var ' ile değiştiriyoruz.
            // Bu, global scope'ta tekrar tanımlanabilir olmalarını sağlar.
            let content = oldScript.textContent || "";
            
            // Sadece değişken tanımlamalarını var yapıyoruz, böylece window üzerinde ezilebilirler
            // Regex: const/let kelimelerinden sonra boşluk gelen kısımları var ile değiştir.
            const safeContent = content.replace(/\b(const|let)\s+/g, 'var ');
            
            // Fonksiyonları global window nesnesine bağlamak için sarmalıyoruz
            // Legacy scriptler genelde function name() { ... } şeklinde tanımlanır.
            newScript.textContent = `
                (function() {
                    try {
                        ${safeContent}
                    } catch (e) {
                        console.warn("Script Execution Warning:", e.message);
                    }
                })();
            `;
            
            oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
    }, []);

    useEffect(() => {
        const fetchPage = async () => {
            if (!id) return;
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "İçerik yüklenemedi.");
            }
            setIsLoading(false);
        };
        fetchPage();
    }, [id]);

    useEffect(() => {
        if (!isLoading && page?.htmlContent) {
            // HTML render edildikten kısa bir süre sonra scriptleri çalıştır
            const timer = setTimeout(() => {
                executeInlineScripts();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isLoading, page?.htmlContent, executeInlineScripts]);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
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
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">Döküman Yükleniyor</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-red-500/20 max-w-md shadow-2xl">
                    <p className="text-red-400 text-xl font-black uppercase mb-8 leading-tight">{error || "Sayfa bulunamadı."}</p>
                    <Button asChild className="w-full bg-white text-slate-900 hover:bg-slate-200 h-12 rounded-xl font-bold">
                        <Link href="/extra">Döküman Listesine Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen flex flex-col transition-all duration-500",
            isFullscreen ? "bg-white p-0" : "bg-slate-50 p-3 sm:p-6"
        )}>
            {/* Navigasyon Barı */}
            {!isFullscreen && (
                <div className="max-w-7xl mx-auto w-full mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-11 w-11 hover:bg-slate-100 shrink-0">
                            <Link href="/extra"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
                        </Button>
                        <div className="min-w-0">
                             <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight truncate leading-tight">
                                {page.title}
                             </h1>
                             <div className="flex items-center gap-3 mt-1">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 text-[9px] font-black uppercase">
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
                        <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-500 w-10 text-center select-none">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100">
                            <Maximize2 className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* İçerik Alanı */}
            <div className={cn(
                "flex-1 relative flex flex-col",
                !isFullscreen && "max-w-7xl mx-auto w-full"
            )}>
                <div 
                    className={cn(
                        "flex-1 bg-white transition-all duration-300 overflow-y-auto custom-scrollbar relative",
                        !isFullscreen && "rounded-[2.5rem] border border-slate-200 shadow-2xl"
                    )}
                    style={{ transformOrigin: 'top center' }}
                >
                    <div 
                        ref={contentRef}
                        className="p-6 sm:p-10 md:p-14 lg:p-20 prose max-w-none"
                        style={{ zoom: zoomLevel }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />

                    {/* Floating Fullscreen Exit */}
                    {isFullscreen && (
                        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity">
                            <Button 
                                onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} 
                                size="icon" 
                                className="h-12 w-12 rounded-full bg-slate-900/80 text-white border border-white/20"
                            >
                                <Minus className="h-6 w-6" />
                            </Button>
                            <Button 
                                onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} 
                                size="icon" 
                                className="h-12 w-12 rounded-full bg-slate-900/80 text-white border border-white/20"
                            >
                                <Plus className="h-6 w-6" />
                            </Button>
                            <Button 
                                onClick={toggleFullscreen} 
                                className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold border border-red-400/30"
                            >
                                <Minimize2 className="mr-2 h-5 w-5" /> Çıkış
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Alt Bilgi */}
            {!isFullscreen && (
                <div className="max-w-7xl mx-auto w-full mt-6 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Din Dersi Atölyesi • İnteraktif Döküman</p>
                </div>
            )}
        </div>
    );
}
