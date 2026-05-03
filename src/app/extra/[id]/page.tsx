
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    Loader2, ArrowLeft, Printer, Maximize, Minimize, 
    Minus, Plus, FileText, Globe, Clock, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getExtraPage } from '@/app/teacher/extra-pages/actions';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ExtraPageViewer() {
    const params = useParams();
    const router = useRouter();
    const [page, setPage] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fontSize, setFontSize] = useState(1.1);
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

        const handleFs = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFs);
        return () => document.removeEventListener('fullscreenchange', handleFs);
    }, [params.id]);

    // Döküman içindeki scriptleri çalıştıran güvenli mekanizma
    useEffect(() => {
        if (page?.htmlContent && contentRef.current) {
            const scripts = contentRef.current.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                
                // Script içeriğini IIFE (Anında çalışan fonksiyon) içine alıyoruz.
                // Bu sayede 'fontSizes' has already been declared gibi SyntaxError hatalarını önlüyoruz.
                newScript.textContent = `
                    (function() {
                        try {
                            ${oldScript.textContent}
                            
                            // Eğer script içinde initAdimAdim gibi fonksiyonlar tanımlandıysa,
                            // bunları React dışından erişilebilir kılmak için window'a bağlıyoruz
                            if (typeof initAdimAdim === 'function') window.initAdimAdim = initAdimAdim;
                            if (typeof showSection === 'function') window.showSection = showSection;
                            if (typeof checkAnswer === 'function') window.checkAnswer = checkAnswer;
                        } catch (err) {
                            console.warn("Script execution error inside Extra Page:", err);
                        }
                    })();
                `;
                document.body.appendChild(newScript);
                setTimeout(() => document.body.removeChild(newScript), 100);
            });

            // DOM'un render edilmesi için kısa bir süre bekleyip init fonksiyonunu çağırıyoruz
            const timer = setTimeout(() => {
                try {
                    if (typeof (window as any).initAdimAdim === 'function') {
                        (window as any).initAdimAdim();
                    }
                } catch (e) {
                    console.error("Failed to run initAdimAdim:", e);
                }
            }, 150);

            return () => clearTimeout(timer);
        }
    }, [page?.htmlContent]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!page) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-white p-6">
                <div className="bg-slate-900 p-8 rounded-3xl border border-white/10 text-center max-w-md shadow-2xl">
                    <FileText className="h-16 w-16 text-slate-700 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Döküman Bulunamadı</h2>
                    <p className="text-slate-400 mb-8">Ulaşmaya çalıştığınız içerik silinmiş veya taşınmış olabilir.</p>
                    <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl h-12">
                        <Link href="/extra">Galeriye Dön</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(
            "min-h-screen bg-white transition-colors duration-300",
            isFullscreen ? "p-0" : "p-4 md:p-8"
        )}>
            {/* TOOLBAR */}
            <div className={cn(
                "sticky top-4 z-50 flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 max-w-7xl mx-auto print:hidden",
                isFullscreen && "rounded-none border-x-0 border-t-0 top-0 max-w-none"
            )}>
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/10 rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="h-8 w-px bg-white/10 mx-1" />
                    <div className="hidden sm:block">
                        <h1 className="font-black text-white text-base truncate max-w-[200px] md:max-w-md uppercase tracking-tight">{page.title}</h1>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{page.category || 'Döküman'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5 mr-2">
                        <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.max(0.5, s - 0.1))} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg"><Minus className="h-4 w-4"/></Button>
                        <span className="text-[10px] font-black text-slate-500 w-12 text-center uppercase tracking-tighter">Yazı Tipi</span>
                        <Button variant="ghost" size="icon" onClick={() => setFontSize(s => Math.min(3, s + 0.1))} className="h-8 w-8 text-slate-400 hover:text-white rounded-lg"><Plus className="h-4 w-4"/></Button>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => window.print()} className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl">
                        <Printer className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-10 w-10 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl shadow-lg">
                        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <main 
                className={cn(
                    "mx-auto transition-all duration-300",
                    isFullscreen ? "w-full min-h-screen p-8 md:p-12" : "max-w-5xl mt-12 mb-24"
                )}
            >
                <div className="mb-12 border-b pb-8 print:hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                            {page.category || 'GENEL'}
                        </Badge>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">
                            <Clock className="h-3 w-3" />
                            Son Güncelleme: {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString('tr-TR') : 'YENİ'}
                        </div>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-4 uppercase">{page.title}</h2>
                    {page.description && (
                        <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-3xl italic">{page.description}</p>
                    )}
                </div>

                <div 
                    ref={contentRef}
                    style={{ fontSize: `${fontSize}rem`, lineHeight: '1.6' }}
                    className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-p:text-justify prose-img:rounded-3xl prose-img:shadow-2xl prose-a:text-indigo-600 prose-strong:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: page.htmlContent }} 
                />
                
                {/* FOOTER AREA */}
                <div className="mt-20 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 print:hidden">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <Globe className="h-6 w-6 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Platform</p>
                            <p className="font-bold text-slate-900 text-sm">Din Dersi Atölyesi</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                         <div className="p-1 bg-amber-50 rounded-lg">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                         </div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dijital Öğrenme Materyali</span>
                    </div>
                </div>
            </main>
        </div>
    );
}

