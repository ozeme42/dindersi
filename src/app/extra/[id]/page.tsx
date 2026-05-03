
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    ArrowLeft, Loader2, Maximize2, Minimize2, 
    Plus, Minus, Printer, Share2, Globe, Clock, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPage = async () => {
            if (!params.id) return;
            setIsLoading(true);
            const res = await getExtraPage(params.id as string);
            if (res.success) {
                setPage(res.data);
            }
            setIsLoading(false);
        };
        fetchPage();
    }, [params.id]);

    // Döküman içindeki scriptleri çalıştıran güvenli sistem
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            // Önce global uyumluluk fonksiyonlarını tanımlayalım
            (window as any).go = (n: number) => window.history.go(n);
            
            // Mevcut scriptleri temizle
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                // Scriptleri IIFE ile sarmalayarak 'Identifier already declared' hatasını önlüyoruz
                newScript.textContent = `(function(){ try { ${oldScript.textContent} } catch(e){ console.error('Script Error:', e); } })();`;
                document.body.appendChild(newScript);
                // Çalıştıktan sonra temizle (DOM kirletmemek için)
                setTimeout(() => document.body.removeChild(newScript), 100);
            });

            // DOM'un yerleşmesi için kısa bir bekleyişten sonra init fonksiyonlarını çağır
            setTimeout(() => {
                try {
                    if (typeof (window as any).initAdimAdim === 'function') {
                        (window as any).initAdimAdim();
                    }
                } catch (e) {
                    console.warn("Init function error (silent):", e);
                }
            }, 300);
        }
    }, [page?.htmlContent]);

    const handlePrint = () => window.print();

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: page?.title,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Bağlantı kopyalandı!");
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">İçerik Yükleniyor</p>
            </div>
        );
    }

    if (!page) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-200 max-w-md">
                    <XCircle className="h-20 w-20 text-red-400 mx-auto mb-6" />
                    <h1 className="text-2xl font-black text-slate-900 mb-2">SAYFA BULUNAMADI</h1>
                    <p className="text-slate-500 mb-8">İstediğiniz içerik kaldırılmış veya taşınmış olabilir.</p>
                    <Button asChild className="rounded-2xl h-14 w-full bg-slate-900 text-white hover:bg-slate-800">
                        <Link href="/extra">Döküman Merkezi'ne Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen bg-slate-50 font-sans transition-all duration-500",
            isFullscreen ? "fixed inset-0 z-[100] overflow-y-auto bg-white p-0" : "p-4 md:p-8"
        )}>
            {/* Navigasyon Bar */}
            {!isFullscreen && (
                <div className="container mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                         <Button variant="ghost" size="icon" asChild className="rounded-full h-12 w-12 bg-white shadow-md hover:bg-slate-50 border border-slate-100">
                            <Link href="/extra"><ArrowLeft className="h-6 w-6 text-slate-600" /></Link>
                         </Button>
                         <div className="min-w-0">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight truncate max-w-[60vw]">
                                {page.title}
                            </h1>
                            <div className="flex items-center gap-4 mt-1">
                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">
                                    {page.category || 'Genel'}
                                </Badge>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <Clock className="h-3 w-3" />
                                    {page.updatedAt ? format(new Date(page.updatedAt), 'dd MMMM yyyy', { locale: tr }) : '-'}
                                </div>
                            </div>
                         </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-[2rem] border border-slate-200 shadow-lg">
                        <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-xl"><Minus className="h-4 w-4"/></Button>
                            <span className="text-[10px] font-black text-slate-500 w-12 text-center">%{Math.round(zoomLevel * 100)}</span>
                            <Button variant="ghost" size="icon" onClick={() => setZoomLevel(z => Math.min(3, z + 0.1))} className="h-9 w-9 text-slate-600 hover:bg-white rounded-xl"><Plus className="h-4 w-4"/></Button>
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-1" />
                        <Button onClick={handlePrint} variant="ghost" size="icon" className="h-11 w-11 rounded-full text-slate-600 hover:bg-slate-100"><Printer className="h-5 w-5"/></Button>
                        <Button onClick={handleShare} variant="ghost" size="icon" className="h-11 w-11 rounded-full text-slate-600 hover:bg-slate-100"><Share2 className="h-5 w-5"/></Button>
                        <Button 
                            onClick={() => setIsFullscreen(!isFullscreen)} 
                            className={cn(
                                "h-11 w-11 rounded-full shadow-lg transition-all",
                                isFullscreen ? "bg-red-500 hover:bg-red-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            )}
                        >
                            {isFullscreen ? <Minimize2 className="h-5 w-5"/> : <Maximize2 className="h-5 w-5"/>}
                        </Button>
                    </div>
                </div>
            )}

            {/* İçerik Kartı */}
            <div className={cn(
                "transition-all duration-500",
                isFullscreen ? "bg-white" : "container mx-auto pb-20"
            )}>
                <Card className={cn(
                    "w-full transition-all border-none bg-white",
                    isFullscreen ? "rounded-none" : "rounded-[3rem] shadow-2xl p-6 md:p-12 min-h-[85vh] border border-slate-100"
                )}>
                    <div 
                        ref={contentRef}
                        className="prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-a:text-indigo-600 prose-img:rounded-3xl prose-img:shadow-xl"
                        style={{ 
                            zoom: zoomLevel,
                            transformOrigin: 'top center'
                        }}
                        dangerouslySetInnerHTML={{ __html: page.htmlContent }}
                    />
                </Card>
            </div>

            {/* Tam Ekran Kapatma Butonu (Floating) */}
            {isFullscreen && (
                <div className="fixed bottom-8 right-8 z-[110] animate-in fade-in slide-in-from-bottom-4">
                    <Button 
                        onClick={() => setIsFullscreen(false)} 
                        className="h-16 w-16 rounded-full bg-slate-900/90 text-white shadow-2xl backdrop-blur-md hover:bg-slate-800"
                    >
                        <Minimize2 className="h-8 w-8" />
                    </Button>
                </div>
            )}
        </div>
    );
}

// XCircle ikonu için eksik import tanımı
const XCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);
