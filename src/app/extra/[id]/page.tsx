'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Download, Plus, Minus, Maximize2, 
    Minimize2, Printer, Calendar, Tag, BookOpen, Clock, Globe
} from 'lucide-react';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FullscreenToggle } from '@/components/fullscreen-toggle';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const pageId = params.id as string;

    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fontSize, setFontSize] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    const fetchPage = useCallback(async () => {
        if (!pageId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await getExtraPage(pageId);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Döküman yüklenemedi.");
            }
        } catch (e) {
            setError("Sunucu bağlantısı sırasında bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    }, [pageId]);

    useEffect(() => { fetchPage(); }, [fetchPage]);

    // Döküman içindeki scriptleri güvenli bir şekilde çalıştıran mekanizma
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // Mevcut scriptleri temizle (isteğe bağlı)
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Script içeriğini IIFE (Anında Çalışan Fonksiyon) içine alarak çakışmaları önle
                newScript.textContent = `(function(){ 
                    try {
                        ${oldScript.textContent}
                        
                        // Fonksiyonları global window nesnesine bağla (ReferenceError'u çözer)
                        if (typeof showSection === 'function') window.showSection = showSection;
                        if (typeof initAdimAdim === 'function') window.initAdimAdim = initAdimAdim;
                        if (typeof checkAnswer === 'function') window.checkAnswer = checkAnswer;
                    } catch(e) { console.error('Extra Page Script Error:', e); }
                })()`;
                
                document.body.appendChild(newScript);
                // Script çalıştıktan sonra temizle (DOM'u kirletmemek için)
                setTimeout(() => document.body.removeChild(newScript), 100);
            });

            // Eğer sayfa yüklendiğinde çalışması gereken bir init fonksiyonu varsa
            if (window.hasOwnProperty('initAdimAdim')) {
                (window as any).initAdimAdim();
            }
        }
    }, [page?.htmlContent]);

    const printPage = () => window.print();

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !page) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
                <div className="bg-white p-8 rounded-[2.5rem] border border-red-500/20 shadow-2xl max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Hata!</h2>
                    <p className="text-slate-500 mb-8">{error || "Döküman bulunamadı."}</p>
                    <Button asChild className="w-full h-12 bg-slate-900 hover:bg-slate-800 rounded-xl">
                        <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-[#f8fafc] flex flex-col relative overflow-x-hidden print:bg-white">
            {/* Arka Plan Efektleri */}
            {!isFullscreen && (
                <div className="fixed inset-0 pointer-events-none z-0 print:hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-50/50 rounded-full blur-[100px]" />
                </div>
            )}

            {/* ÜST ARAÇ ÇUBUĞU */}
            <header className={cn(
                "sticky top-0 z-40 transition-all duration-300 print:hidden",
                isFullscreen 
                    ? "p-2 bg-slate-900/80 backdrop-blur-md border-b border-white/10 opacity-0 hover:opacity-100 focus-within:opacity-100" 
                    : "p-4 md:p-6 bg-white/80 backdrop-blur-xl border-b border-slate-200"
            )}>
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-xl h-10 w-10", isFullscreen ? "text-white hover:bg-white/10" : "text-slate-500 hover:bg-slate-100")}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="overflow-hidden">
                            <h1 className={cn("font-black uppercase tracking-tight truncate", isFullscreen ? "text-white text-lg" : "text-slate-900 text-xl md:text-2xl")}>
                                {page.title}
                            </h1>
                            {!isFullscreen && (
                                <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 text-[10px] font-black uppercase px-2">
                                        <Tag className="h-3 w-3 mr-1" /> {page.category || 'Genel'}
                                    </Badge>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                                        <Clock className="h-3 w-3" /> {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : '-'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {/* Zoom Kontrolleri */}
                        <div className={cn("flex items-center rounded-xl p-1 border", isFullscreen ? "bg-white/10 border-white/20" : "bg-slate-100 border-slate-200")}>
                            <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.max(0.5, s - 0.1))} className={cn("h-8 w-8 rounded-lg", isFullscreen ? "text-white hover:bg-white/10" : "text-slate-600 hover:bg-white shadow-sm")}>
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className={cn("text-[10px] font-bold w-12 text-center", isFullscreen ? "text-slate-400" : "text-slate-500")}>
                                {Math.round(fontSize * 100)}%
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.min(2.5, s + 0.1))} className={cn("h-8 w-8 rounded-lg", isFullscreen ? "text-white hover:bg-white/10" : "text-slate-600 hover:bg-white shadow-sm")}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block" />

                        <Button variant="outline" size="sm" onClick={printPage} className={cn("rounded-xl gap-2 h-10 border-slate-200", isFullscreen ? "bg-white/10 text-white border-white/20" : "bg-white text-slate-600")}>
                            <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Yazdır</span>
                        </Button>
                        
                        <FullscreenToggle elementRef={containerRef} className={cn("h-10 w-10 rounded-xl border-none", isFullscreen ? "bg-white/10 text-white" : "bg-indigo-600 text-white shadow-lg shadow-indigo-100")} />
                    </div>
                </div>
            </header>

            {/* İÇERİK ALANI */}
            <main 
                className={cn(
                    "flex-1 container mx-auto relative z-10 transition-all duration-300",
                    isFullscreen ? "p-4 md:p-12 max-w-none bg-white" : "p-6 md:p-12"
                )}
                style={{ fontSize: `${fontSize}rem` }}
            >
                <div className="max-w-5xl mx-auto">
                    {/* Sayfa Üstü Bilgisi (Sadece Ekran Modunda) */}
                    {!isFullscreen && (
                         <div className="mb-12 border-b border-slate-200 pb-8 print:hidden">
                            <div className="flex items-center gap-3 text-indigo-600 font-bold text-sm mb-4 uppercase tracking-widest">
                                <BookOpen className="h-5 w-5" /> Döküman İçeriği
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
                                {page.title}
                            </h2>
                            {page.description && <p className="mt-4 text-xl text-slate-500 font-medium leading-relaxed italic">{page.description}</p>}
                         </div>
                    )}

                    {/* Döküman HTML İçeriği */}
                    <div 
                        ref={contentRef}
                        className={cn(
                            "prose prose-slate max-w-none print:prose-p:text-black print:prose-headings:text-black",
                            "prose-headings:font-black prose-headings:tracking-tight",
                            "prose-p:leading-relaxed prose-p:text-slate-700",
                            "prose-img:rounded-3xl prose-img:shadow-2xl",
                            "prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline",
                            "prose-strong:text-slate-900"
                        )}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />

                    {/* Alt Bilgi (Sadece Yazdırmada Görünür) */}
                    <div className="hidden print:block mt-20 border-t-2 border-black pt-4 text-center text-xs font-bold uppercase tracking-widest">
                        Bu döküman Din Dersi Atölyesi (dindersiatolyesi.com) platformu üzerinden oluşturulmuştur.
                    </div>
                </div>
            </main>

            {/* FLOATING ACTION BAR (SADECE FULLSCREEN) */}
            {isFullscreen && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10">
                    <div className="flex items-center gap-2 p-2 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl">
                        <Button variant="ghost" size="icon" onClick={decreaseFontSize} className="h-12 w-12 rounded-full text-white hover:bg-white/10"><Minus className="h-6 w-6"/></Button>
                        <div className="w-px h-6 bg-white/20 mx-1"></div>
                        <span className="text-xs font-black text-slate-400 uppercase px-2">BOYUT</span>
                        <div className="w-px h-6 bg-white/20 mx-1"></div>
                        <Button variant="ghost" size="icon" onClick={increaseFontSize} className="h-12 w-12 rounded-full text-white hover:bg-white/10"><Plus className="h-6 w-6"/></Button>
                        <div className="w-px h-8 bg-white/30 mx-2"></div>
                        <FullscreenToggle elementRef={containerRef} className="h-12 w-12 rounded-full bg-red-600 hover:bg-red-500 text-white border-0 shadow-lg" />
                    </div>
                </div>
            )}
        </div>
    );
}