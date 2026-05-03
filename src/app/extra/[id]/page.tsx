'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Download, Plus, Minus, 
    Maximize, Minimize, Globe, Clock, Printer, Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
    
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchContent = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        const res = await getExtraPage(id);
        if (res.success) {
            setContent(res.data);
        } else {
            setError(res.error || "Sayfa yüklenemedi.");
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => {
        fetchContent();
        
        const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, [fetchContent]);

    // Döküman içindeki scriptleri güvenli çalıştırma
    useEffect(() => {
        if (content?.htmlContent && contentRef.current) {
            // Mevcut scriptleri temizle ve yeniden çalıştır
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // SyntaxError (Redeclaration) önlemek için kodu bir blok içine alıyoruz
                // Ayrıca let/const yerine var kullanımı çakışmaları azaltır (ama kod orijinal kalmalı)
                // Bu yüzden her scripti bir IIFE (Anında Çalışan Fonksiyon) içine hapsediyoruz.
                const wrappedCode = `(function(){ 
                    try {
                        ${oldScript.innerHTML} 
                    } catch(e) { 
                        console.warn("Extra Page Script Error:", e); 
                    }
                })()`;
                
                newScript.textContent = wrappedCode;
                document.body.appendChild(newScript);
                document.body.removeChild(newScript); // Çalıştıktan sonra DOM'dan temizle
            });

            // Eğer sayfa özel bir init fonksiyonu bekliyorsa (adim-adim gibi) tetikle
            try {
                if (typeof (window as any).initAdimAdim === 'function') {
                    (window as any).initAdimAdim();
                }
            } catch(e) {}
        }
    }, [content]);

    const handlePrint = () => {
        window.print();
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="h-12 w-12 animate-spin text-indigo-500" /></div>;

    if (error || !content) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-8 bg-slate-950 text-white text-center">
                <AlertTriangle className="h-16 w-16 text-red-500 mb-6" />
                <h2 className="text-2xl font-bold mb-4">{error || "Döküman bulunamadı."}</h2>
                <Button asChild variant="outline" className="border-white/10 text-white hover:bg-white/5">
                    <Link href="/extra"><ArrowLeft className="mr-2" /> Galeriye Dön</Link>
                </Button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={cn(
            "min-h-screen bg-slate-50 flex flex-col transition-all duration-500",
            isFullscreen ? "bg-white p-0" : ""
        )}>
            {/* Navigasyon Bar */}
            <header className={cn(
                "flex-shrink-0 z-30 flex items-center justify-between px-4 md:px-8 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 shadow-sm print:hidden",
                isFullscreen && "bg-slate-50/50 opacity-0 hover:opacity-100 transition-opacity"
            )}>
                <div className="flex items-center gap-4 overflow-hidden">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 rounded-full hover:bg-slate-100">
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Button>
                    <div className="overflow-hidden">
                        <h1 className="text-lg font-black text-slate-900 truncate uppercase tracking-tight leading-none">{content.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none text-[9px] font-bold uppercase">{content.category || 'Genel'}</Badge>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setFontSize(f => Math.max(0.5, f - 0.1))} className="h-8 w-8 hover:bg-white text-slate-500"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-400 w-12 text-center">{Math.round(fontSize * 100)}%</span>
                        <Button variant="ghost" size="icon" onClick={() => setFontSize(f => Math.min(2.5, f + 0.1))} className="h-8 w-8 hover:bg-white text-slate-500"><Plus className="h-4 w-4"/></Button>
                    </div>
                    
                    <Button variant="outline" size="icon" onClick={handlePrint} className="h-10 w-10 rounded-xl border-slate-200 text-slate-600 hidden sm:flex">
                        <Printer className="h-5 w-5" />
                    </Button>
                    
                    <Button variant="outline" size="icon" onClick={toggleFullscreen} className="h-10 w-10 rounded-xl border-slate-200 text-slate-600">
                        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </Button>
                </div>
            </header>

            {/* İçerik Alanı */}
            <main className={cn(
                "flex-grow flex flex-col items-center relative z-10 overflow-y-auto overflow-x-hidden p-6 md:p-12 print:p-0",
                isFullscreen ? "bg-white" : "bg-slate-50"
            )}>
                <div 
                    ref={contentRef}
                    className="w-full max-w-5xl mx-auto prose prose-slate prose-indigo transition-all duration-300"
                    style={{ transform: `scale(${fontSize})`, transformOrigin: 'top center' }}
                    dangerouslySetInnerHTML={{ __html: content.htmlContent }}
                />
            </main>

            {/* Yazdırma Modu için Başlık (Sadece çıktı alırken görünür) */}
            <div className="hidden print:block absolute top-0 left-0 w-full p-8 text-center border-b-2 border-slate-900">
                <h1 className="text-3xl font-bold uppercase">{content.title}</h1>
                <p className="text-sm mt-2">Döküman Merkezi | dindersiatolyesi.com</p>
            </div>
        </div>
    );
}

const AlertTriangle = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-4.8 0l-8 14a2 2 0 0 0 1.73 3h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);