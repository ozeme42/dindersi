
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Printer, Maximize, Minimize, 
    Minus, Plus, Clock, Tag, Globe, ChevronRight, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const contentRef = useRef<HTMLDivElement>(null);

    // --- SCRIPT RUNNER ---
    // dangerouslySetInnerHTML ile eklenen scriptler çalışmaz.
    // Bu useEffect scriptleri manuel olarak çalıştırır ve IIFE kapsamına alarak 
    // "Identifier has already been declared" hatalarını önler.
    useEffect(() => {
        if (!page?.htmlContent) return;

        // 1. Global Fonksiyonları Tanımla (onclick eventleri için)
        (window as any).go = (n: number) => window.history.go(n);
        
        // 2. Mevcut scriptleri temizle ve yenilerini ekle
        const timer = setTimeout(() => {
            if (!contentRef.current) return;
            
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // Kodları bir blok kapsamına (IIFE) alarak değişken çakışmalarını önlüyoruz
                newScript.textContent = `
                    (function() {
                        try {
                            ${oldScript.textContent}
                        } catch (e) {
                            console.warn("Script execution error in Extra Page:", e);
                        }
                    })();
                `;
                
                document.body.appendChild(newScript);
                // Script çalıştıktan sonra temizle (DOM'da kalabalık yapmasın)
                setTimeout(() => document.body.removeChild(newScript), 100);
            });

            // initAdimAdim gibi dökümana özel bir başlatma fonksiyonu varsa tetikle
            try {
                if (typeof (window as any).initAdimAdim === 'function') {
                    (window as any).initAdimAdim();
                }
            } catch (e) {}
        }, 500); // DOM yerleşimi için kısa bir bekleme

        return () => clearTimeout(timer);
    }, [page?.htmlContent]);

    useEffect(() => {
        const fetchPage = async () => {
            setIsLoading(true);
            const res = await getExtraPage(id);
            if (res.success) {
                setPage(res.data);
            } else {
                setError(res.error || "Sayfa bulunamadı.");
            }
            setIsLoading(false);
        };
        fetchPage();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [id]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">İçerik Yükleniyor...</p>
            </div>
        );
    }

    if (error || !page) {
        return (
            <div className="h-screen w-full flex items-center justify-center p-6 bg-slate-50">
                <Card className="max-w-md w-full border-red-100 shadow-2xl rounded-[2.5rem] overflow-hidden">
                    <div className="bg-red-500 h-2 w-full" />
                    <CardHeader className="text-center pt-8">
                        <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="h-8 w-8 text-red-600" />
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-900 uppercase">HATA</CardTitle>
                        <CardDescription className="text-red-600 font-medium mt-2">{error}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pb-8 justify-center">
                        <Button asChild variant="outline" className="rounded-xl px-8 border-slate-200">
                            <Link href="/extra"><ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen transition-colors duration-500 flex flex-col",
            isFullscreen ? "bg-white" : "bg-slate-50"
        )}>
            {/* Toolbar */}
            <header className={cn(
                "sticky top-0 z-50 transition-all duration-300 border-b",
                isFullscreen 
                    ? "bg-white/80 backdrop-blur-md border-slate-100 px-4 py-2" 
                    : "bg-white/80 backdrop-blur-md border-slate-200 px-4 py-4"
            )}>
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        {!isFullscreen && (
                            <Button asChild variant="ghost" size="icon" className="rounded-full hover:bg-slate-100 shrink-0">
                                <Link href="/extra"><ArrowLeft className="h-5 w-5 text-slate-600" /></Link>
                            </Button>
                        )}
                        <div className="min-w-0">
                            <h1 className={cn(
                                "font-black text-slate-900 uppercase truncate leading-none",
                                isFullscreen ? "text-base" : "text-xl"
                            )}>
                                {page.title}
                            </h1>
                            {!isFullscreen && (
                                <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                                    <Badge variant="outline" className="text-[9px] bg-slate-50 border-slate-100 text-slate-400 shrink-0">DÖKÜMAN</Badge>
                                    <span className="text-slate-300">|</span>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider truncate">
                                        <Globe className="h-3 w-3" /> {page.category || 'Genel'}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Zoom Controls */}
                        <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg">
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-[10px] font-black text-slate-500 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.1))} className="h-8 w-8 text-slate-600 hover:bg-white rounded-lg">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <Button variant="outline" size="icon" onClick={() => window.print()} className="rounded-xl border-slate-200 text-slate-600 h-10 w-10">
                            <Printer className="h-5 w-5" />
                        </Button>
                        
                        <Button variant="outline" size="icon" onClick={toggleFullscreen} className="rounded-xl border-slate-200 text-slate-600 h-10 w-10">
                            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <main className={cn(
                "flex-1 transition-all duration-500 py-8 px-4",
                isFullscreen ? "bg-white" : "container mx-auto"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[2.5rem] shadow-2xl p-6 md:p-12 min-h-[80vh]"
                )}>
                    <CardContent className="p-0">
                        {/* 
                            DOCTYPE, HTML ve BODY etiketlerini içerikten temizleyip 
                            prose (Tailwind Tipografi) sınıfıyla render ediyoruz.
                        */}
                        <div 
                            ref={contentRef}
                            style={{ 
                                fontSize: `${zoomLevel}rem`, 
                                transformOrigin: 'top center',
                                transition: 'font-size 0.2s ease-out'
                            }}
                            className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-a:text-indigo-600 prose-img:rounded-3xl prose-img:shadow-xl"
                            dangerouslySetInnerHTML={{ 
                                __html: page.htmlContent
                                    .replace(/<!DOCTYPE[^>]*>/gi, "")
                                    .replace(/<\/?html[^>]*>/gi, "")
                                    .replace(/<\/?body[^>]*>/gi, "")
                                    .replace(/<\/?head[^>]*>/gi, "")
                            }} 
                        />
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

// X simgesi lucide'den gelsin
function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
